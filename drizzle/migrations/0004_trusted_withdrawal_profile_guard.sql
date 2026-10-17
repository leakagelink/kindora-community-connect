CREATE OR REPLACE FUNCTION public.guard_private_identity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_TABLE_NAME='profiles' THEN
  IF current_user='authenticated' AND NOT public.is_staff(auth.uid()) THEN
   IF TG_OP='INSERT' AND (new.is_restricted IS DISTINCT FROM false OR new.suspended_until IS NOT NULL OR new.completed_help_count IS DISTINCT FROM 0 OR new.deleted_at IS NOT NULL) THEN RAISE EXCEPTION 'Protected profile fields'; END IF;
   IF TG_OP='UPDATE' AND (new.id IS DISTINCT FROM old.id OR new.is_restricted IS DISTINCT FROM old.is_restricted OR new.suspended_until IS DISTINCT FROM old.suspended_until OR new.completed_help_count IS DISTINCT FROM old.completed_help_count OR new.deleted_at IS DISTINCT FROM old.deleted_at) THEN RAISE EXCEPTION 'Protected profile fields'; END IF;
  END IF;
 ELSIF TG_OP='UPDATE' THEN
  IF TG_TABLE_NAME='messages' THEN
   IF new.id IS DISTINCT FROM old.id OR new.sender_id IS DISTINCT FROM old.sender_id OR new.conversation_id IS DISTINCT FROM old.conversation_id OR new.created_at IS DISTINCT FROM old.created_at THEN RAISE EXCEPTION 'Message identity cannot change'; END IF;
   IF current_user='authenticated' AND NOT public.is_staff(auth.uid()) AND auth.uid()<>old.sender_id AND (new.body IS DISTINCT FROM old.body OR new.attachment_url IS DISTINCT FROM old.attachment_url OR new.deleted_at IS DISTINCT FROM old.deleted_at) THEN RAISE EXCEPTION 'Only sender may edit message content'; END IF;
  ELSIF TG_TABLE_NAME='conversations' AND (new.id IS DISTINCT FROM old.id OR new.created_by IS DISTINCT FROM old.created_by OR new.request_id IS DISTINCT FROM old.request_id OR new.listing_id IS DISTINCT FROM old.listing_id) THEN RAISE EXCEPTION 'Conversation identity cannot change';
  ELSIF TG_TABLE_NAME='conversation_participants' AND (new.user_id IS DISTINCT FROM old.user_id OR new.conversation_id IS DISTINCT FROM old.conversation_id) THEN RAISE EXCEPTION 'Participation identity cannot change';
  ELSIF TG_TABLE_NAME='notifications' AND current_user='authenticated' AND NOT public.is_staff(auth.uid()) AND (new.user_id IS DISTINCT FROM old.user_id OR new.title IS DISTINCT FROM old.title OR new.body IS DISTINCT FROM old.body OR new.type IS DISTINCT FROM old.type OR new.link IS DISTINCT FROM old.link) THEN RAISE EXCEPTION 'Only read status may change';
  END IF;
 END IF;
 RETURN new;
END $$;