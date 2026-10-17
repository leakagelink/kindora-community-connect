CREATE FUNCTION public.ensure_goodivo_conversation(p_other_user uuid,p_request_id uuid DEFAULT NULL,p_listing_id uuid DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid(); cid uuid;
BEGIN
 IF u IS NULL OR p_other_user IS NULL OR p_other_user=u THEN RAISE EXCEPTION 'Two different members required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=u AND deleted_at IS NULL AND NOT is_restricted AND (suspended_until IS NULL OR suspended_until<=now())) OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_other_user AND deleted_at IS NULL) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.blocked_users WHERE (blocker_id=u AND blocked_id=p_other_user) OR (blocker_id=p_other_user AND blocked_id=u)) THEN RAISE EXCEPTION 'Messaging is blocked'; END IF;
 IF p_request_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.help_requests WHERE id=p_request_id AND deleted_at IS NULL AND (owner_id IN (u,p_other_user) OR status IN ('published','receiving_offers','in_progress','completed'))) THEN RAISE EXCEPTION 'Request unavailable'; END IF;
 IF p_listing_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.product_listings WHERE id=p_listing_id AND deleted_at IS NULL AND (owner_id IN (u,p_other_user) OR status IN ('published','reserved','given_away'))) THEN RAISE EXCEPTION 'Listing unavailable'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('conversation:'||least(u::text,p_other_user::text)||':'||greatest(u::text,p_other_user::text)||':'||coalesce(p_request_id::text,'')||':'||coalesce(p_listing_id::text,''),0));
 SELECT c.id INTO cid FROM public.conversations c WHERE c.request_id IS NOT DISTINCT FROM p_request_id AND c.listing_id IS NOT DISTINCT FROM p_listing_id AND EXISTS(SELECT 1 FROM public.conversation_participants WHERE conversation_id=c.id AND user_id=u) AND EXISTS(SELECT 1 FROM public.conversation_participants WHERE conversation_id=c.id AND user_id=p_other_user) ORDER BY c.created_at LIMIT 1;
 IF cid IS NOT NULL THEN RETURN cid; END IF;
 IF (SELECT count(*) FROM public.conversations WHERE created_by=u AND created_at>now()-interval '1 minute')>=5 THEN RAISE EXCEPTION 'Please wait before starting another conversation'; END IF;
 INSERT INTO public.conversations(created_by,request_id,listing_id) VALUES(u,p_request_id,p_listing_id) RETURNING id INTO cid;
 INSERT INTO public.conversation_participants(conversation_id,user_id) VALUES(cid,u),(cid,p_other_user);
 RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.ensure_goodivo_conversation(uuid,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ensure_goodivo_conversation(uuid,uuid,uuid) TO authenticated;