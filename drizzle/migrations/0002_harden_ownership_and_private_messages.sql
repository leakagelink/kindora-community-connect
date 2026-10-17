ALTER POLICY "participants update conversations" ON public.conversations WITH CHECK(public.is_conversation_participant(id,auth.uid()));
ALTER POLICY "owners update requests" ON public.help_requests WITH CHECK(owner_id=auth.uid() OR public.is_staff(auth.uid()));
ALTER POLICY "participants update messages" ON public.messages WITH CHECK(public.is_conversation_participant(conversation_id,auth.uid()));
ALTER POLICY "parties update interests" ON public.product_interests WITH CHECK(user_id=auth.uid() OR public.is_staff(auth.uid()) OR EXISTS(SELECT 1 FROM public.product_listings l WHERE l.id=listing_id AND l.owner_id=auth.uid()));
ALTER POLICY "own listings update" ON public.product_listings WITH CHECK(owner_id=auth.uid() OR public.is_staff(auth.uid()));
ALTER POLICY "update own profile" ON public.profiles WITH CHECK(id=auth.uid() OR public.is_staff(auth.uid()));
ALTER POLICY "parties update applications" ON public.request_applications WITH CHECK(helper_id=auth.uid() OR public.is_staff(auth.uid()) OR EXISTS(SELECT 1 FROM public.help_requests r WHERE r.id=request_id AND r.owner_id=auth.uid()));
ALTER POLICY "update own review" ON public.reviews WITH CHECK(reviewer_id=auth.uid() OR public.is_staff(auth.uid()));
ALTER POLICY "own offers update" ON public.service_offers WITH CHECK(user_id=auth.uid() OR public.is_staff(auth.uid()));
ALTER POLICY "insert notifications" ON public.notifications WITH CHECK(public.is_staff(auth.uid()));
CREATE FUNCTION public.can_create_conversation_member(p_id uuid,p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.conversations WHERE id=p_id AND created_by=auth.uid()) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user AND deleted_at IS NULL) AND NOT EXISTS(SELECT 1 FROM public.blocked_users WHERE (blocker_id=auth.uid() AND blocked_id=p_user) OR (blocked_id=auth.uid() AND blocker_id=p_user))
$$;
REVOKE ALL ON FUNCTION public.can_create_conversation_member(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_create_conversation_member(uuid,uuid) TO authenticated;
ALTER POLICY "add participants" ON public.conversation_participants WITH CHECK(public.can_create_conversation_member(conversation_id,user_id));
CREATE FUNCTION public.guard_private_identity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_TABLE_NAME='profiles' THEN
  IF auth.role()='authenticated' AND NOT public.is_staff(auth.uid()) THEN
   IF TG_OP='INSERT' AND (new.is_restricted IS DISTINCT FROM false OR new.suspended_until IS NOT NULL OR new.completed_help_count IS DISTINCT FROM 0 OR new.deleted_at IS NOT NULL) THEN RAISE EXCEPTION 'Protected profile fields'; END IF;
   IF TG_OP='UPDATE' AND (new.id IS DISTINCT FROM old.id OR new.is_restricted IS DISTINCT FROM old.is_restricted OR new.suspended_until IS DISTINCT FROM old.suspended_until OR new.completed_help_count IS DISTINCT FROM old.completed_help_count OR new.deleted_at IS DISTINCT FROM old.deleted_at) THEN RAISE EXCEPTION 'Protected profile fields'; END IF;
  END IF;
 ELSIF TG_OP='UPDATE' THEN
  IF TG_TABLE_NAME='messages' THEN
   IF new.id IS DISTINCT FROM old.id OR new.sender_id IS DISTINCT FROM old.sender_id OR new.conversation_id IS DISTINCT FROM old.conversation_id OR new.created_at IS DISTINCT FROM old.created_at THEN RAISE EXCEPTION 'Message identity cannot change'; END IF;
   IF auth.role()='authenticated' AND NOT public.is_staff(auth.uid()) AND auth.uid()<>old.sender_id AND (new.body IS DISTINCT FROM old.body OR new.attachment_url IS DISTINCT FROM old.attachment_url OR new.deleted_at IS DISTINCT FROM old.deleted_at) THEN RAISE EXCEPTION 'Only sender may edit message content'; END IF;
  ELSIF TG_TABLE_NAME='conversations' AND (new.id IS DISTINCT FROM old.id OR new.created_by IS DISTINCT FROM old.created_by OR new.request_id IS DISTINCT FROM old.request_id OR new.listing_id IS DISTINCT FROM old.listing_id) THEN RAISE EXCEPTION 'Conversation identity cannot change';
  ELSIF TG_TABLE_NAME='conversation_participants' AND (new.user_id IS DISTINCT FROM old.user_id OR new.conversation_id IS DISTINCT FROM old.conversation_id) THEN RAISE EXCEPTION 'Participation identity cannot change';
  ELSIF TG_TABLE_NAME='notifications' AND auth.role()='authenticated' AND NOT public.is_staff(auth.uid()) AND (new.user_id IS DISTINCT FROM old.user_id OR new.title IS DISTINCT FROM old.title OR new.body IS DISTINCT FROM old.body OR new.type IS DISTINCT FROM old.type OR new.link IS DISTINCT FROM old.link) THEN RAISE EXCEPTION 'Only read status may change';
  END IF;
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER guard_profile_identity BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_private_identity();
CREATE TRIGGER guard_message_identity BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.guard_private_identity();
CREATE TRIGGER guard_conversation_identity BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.guard_private_identity();
CREATE TRIGGER guard_participation_identity BEFORE UPDATE ON public.conversation_participants FOR EACH ROW EXECUTE FUNCTION public.guard_private_identity();
CREATE TRIGGER guard_notification_identity BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.guard_private_identity();
CREATE FUNCTION public.after_message_saved() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.conversations SET last_message_at=new.created_at WHERE id=new.conversation_id;
 INSERT INTO public.notifications(user_id,type,title,link) SELECT user_id,'message','New message','/messages/'||new.conversation_id FROM public.conversation_participants WHERE conversation_id=new.conversation_id AND user_id<>new.sender_id;
 RETURN new;
END $$;
CREATE TRIGGER message_side_effects AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.after_message_saved();
CREATE FUNCTION public.check_message_send() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF auth.role()='authenticated' THEN
  IF new.sender_id IS DISTINCT FROM auth.uid() OR NOT public.is_conversation_participant(new.conversation_id,auth.uid()) THEN RAISE EXCEPTION 'Conversation access required'; END IF;
  IF length(btrim(new.body)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'Message must contain 1 to 2000 characters'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('message:'||auth.uid()::text,0));
  IF (SELECT count(*) FROM public.messages WHERE sender_id=auth.uid() AND created_at>now()-interval '1 minute')>=20 THEN RAISE EXCEPTION 'Message rate limit reached'; END IF;
  IF EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND (deleted_at IS NOT NULL OR is_restricted OR suspended_until>now())) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
  IF EXISTS(SELECT 1 FROM public.conversation_participants p JOIN public.blocked_users b ON (b.blocker_id=auth.uid() AND b.blocked_id=p.user_id) OR (b.blocked_id=auth.uid() AND b.blocker_id=p.user_id) WHERE p.conversation_id=new.conversation_id) THEN RAISE EXCEPTION 'Messaging is blocked'; END IF;
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER check_message_send BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.check_message_send();
REVOKE ALL ON FUNCTION public.guard_private_identity(),public.after_message_saved(),public.check_message_send() FROM PUBLIC,anon,authenticated;