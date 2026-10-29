REVOKE INSERT ON public.conversation_participants, public.conversations FROM authenticated;
CREATE OR REPLACE FUNCTION public.check_message_send() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.role()='authenticated' THEN
  IF new.sender_id IS DISTINCT FROM auth.uid() OR NOT public.is_conversation_participant(new.conversation_id,auth.uid()) THEN RAISE EXCEPTION 'Conversation access required'; END IF;
  IF length(btrim(new.body)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Message must contain 1 to 2000 characters'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('message:'||auth.uid()::text,0));
  new.created_at:=now();
  IF (SELECT count(*) FROM public.messages WHERE sender_id=auth.uid() AND created_at>now()-interval '1 minute')>=20 THEN RAISE EXCEPTION 'Message rate limit reached'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND deleted_at IS NULL AND NOT is_restricted AND (suspended_until IS NULL OR suspended_until<=now())) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
  IF EXISTS(SELECT 1 FROM public.conversation_participants p JOIN public.blocked_users b ON (b.blocker_id=auth.uid() AND b.blocked_id=p.user_id) OR (b.blocked_id=auth.uid() AND b.blocker_id=p.user_id) WHERE p.conversation_id=new.conversation_id) THEN RAISE EXCEPTION 'Messaging is blocked'; END IF;
 END IF;
 RETURN new;
END $$;
REVOKE ALL ON FUNCTION public.check_message_send() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.ensure_goodivo_conversation(p_other_user uuid,p_request_id uuid DEFAULT NULL,p_listing_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); cid uuid;
BEGIN
 IF u IS NULL OR p_other_user IS NULL OR p_other_user=u THEN RAISE EXCEPTION 'Two different members required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=u AND deleted_at IS NULL AND NOT is_restricted AND (suspended_until IS NULL OR suspended_until<=now())) OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_other_user AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.blocked_users WHERE (blocker_id=u AND blocked_id=p_other_user) OR (blocker_id=p_other_user AND blocked_id=u)) THEN RAISE EXCEPTION 'Messaging is blocked'; END IF;
 IF p_request_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.help_requests WHERE id=p_request_id AND deleted_at IS NULL AND (owner_id IN (u,p_other_user) OR status IN ('published','receiving_offers','in_progress','completed'))) THEN RAISE EXCEPTION 'Request unavailable'; END IF;
 IF p_listing_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.product_listings WHERE id=p_listing_id AND deleted_at IS NULL AND (owner_id IN (u,p_other_user) OR status IN ('published','reserved','given_away'))) THEN RAISE EXCEPTION 'Listing unavailable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('conversation-sender:'||u::text,0));
 PERFORM pg_advisory_xact_lock(hashtextextended('conversation:'||least(u::text,p_other_user::text)||':'||greatest(u::text,p_other_user::text)||':'||coalesce(p_request_id::text,'')||':'||coalesce(p_listing_id::text,''),0));
 SELECT c.id INTO cid FROM public.conversations c WHERE c.request_id IS NOT DISTINCT FROM p_request_id AND c.listing_id IS NOT DISTINCT FROM p_listing_id AND (SELECT count(*) FROM public.conversation_participants WHERE conversation_id=c.id)=2 AND EXISTS(SELECT 1 FROM public.conversation_participants WHERE conversation_id=c.id AND user_id=u) AND EXISTS(SELECT 1 FROM public.conversation_participants WHERE conversation_id=c.id AND user_id=p_other_user) ORDER BY c.created_at LIMIT 1;
 IF cid IS NOT NULL THEN RETURN cid; END IF;
 IF (SELECT count(*) FROM public.conversations WHERE created_by=u AND created_at>now()-interval '1 minute')>=5 THEN RAISE EXCEPTION 'Please wait before starting another conversation'; END IF;
 INSERT INTO public.conversations(created_by,request_id,listing_id) VALUES(u,p_request_id,p_listing_id) RETURNING id INTO cid;
 INSERT INTO public.conversation_participants(conversation_id,user_id) VALUES(cid,u),(cid,p_other_user);
 RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.ensure_goodivo_conversation(uuid,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ensure_goodivo_conversation(uuid,uuid,uuid) TO authenticated;
CREATE FUNCTION public.guard_ai_report() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF TG_OP='INSERT' AND new.target_type='ai_generation' THEN
  IF auth.uid() IS NULL OR new.reporter_id<>auth.uid() OR NOT EXISTS(SELECT 1 FROM public.ai_generations WHERE id=new.target_id AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Only your own AI generation can be reported'; END IF;
  IF (SELECT count(*) FROM public.reports WHERE reporter_id=auth.uid() AND created_at>now()-interval '1 hour')>=20 THEN RAISE EXCEPTION 'Report limit reached'; END IF;
  new.created_at:=now();
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER guard_ai_report BEFORE INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.guard_ai_report();
REVOKE ALL ON FUNCTION public.guard_ai_report() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.review_goodivo_report(p_report uuid,p_action text,p_note text DEFAULT '') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.reports; changed integer;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff access required'; END IF;
 IF p_action NOT IN ('dismissed','content_removed','warning','suspended','restricted') OR length(p_note)>2000 THEN RAISE EXCEPTION 'Invalid moderation action'; END IF;
 SELECT * INTO r FROM public.reports WHERE id=p_report FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Report unavailable'; END IF;
 IF r.status NOT IN ('open','under_review') THEN RAISE EXCEPTION 'Report already reviewed'; END IF;
 IF p_action='content_removed' THEN
  CASE r.target_type
   WHEN 'request' THEN UPDATE public.help_requests SET status='rejected',deleted_at=now(),moderation_note=nullif(p_note,'') WHERE id=r.target_id;
   WHEN 'listing' THEN UPDATE public.product_listings SET status='removed',deleted_at=now(),moderation_note=nullif(p_note,'') WHERE id=r.target_id;
   WHEN 'review' THEN UPDATE public.reviews SET is_hidden=true WHERE id=r.target_id;
   WHEN 'message' THEN UPDATE public.messages SET deleted_at=now() WHERE id=r.target_id;
   WHEN 'offer' THEN UPDATE public.service_offers SET is_active=false,deleted_at=now() WHERE id=r.target_id;
   WHEN 'ai_generation' THEN UPDATE public.ai_generations SET output=NULL WHERE id=r.target_id;
   ELSE RAISE EXCEPTION 'Choose a user action for user reports';
  END CASE;
  GET DIAGNOSTICS changed=ROW_COUNT;
  IF changed<>1 THEN RAISE EXCEPTION 'Content unavailable; report not resolved'; END IF;
 ELSIF p_action IN ('warning','suspended','restricted') THEN
  IF r.target_type<>'user' THEN RAISE EXCEPTION 'This action requires a user report'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=r.target_id) THEN RAISE EXCEPTION 'User unavailable'; END IF;
  IF p_action='suspended' THEN UPDATE public.profiles SET suspended_until=now()+interval '7 days' WHERE id=r.target_id; END IF;
  IF p_action='restricted' THEN UPDATE public.profiles SET is_restricted=true,is_public=false WHERE id=r.target_id; END IF;
  INSERT INTO public.notifications(user_id,type,title,body,link) VALUES(r.target_id,'moderation','Goodivo moderation: '||p_action,nullif(p_note,''),'/legal/community-guidelines');
 END IF;
 INSERT INTO public.moderation_actions(moderator_id,report_id,target_type,target_id,action,reason,note) VALUES(auth.uid(),r.id,r.target_type,r.target_id,p_action,r.reason,nullif(p_note,''));
 UPDATE public.reports SET status=CASE WHEN p_action='dismissed' THEN 'dismissed'::public.report_status ELSE 'resolved'::public.report_status END,reviewed_by=auth.uid(),reviewed_at=now() WHERE id=r.id;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id) VALUES(auth.uid(),'moderation:'||p_action,r.target_type,r.target_id);
END $$;
REVOKE ALL ON FUNCTION public.review_goodivo_report(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_goodivo_report(uuid,text,text) TO authenticated;