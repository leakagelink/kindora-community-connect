CREATE FUNCTION public.review_goodivo_post(p_kind text,p_id uuid,p_approve boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner uuid; title_value text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Staff access required'; END IF;
 IF p_kind='request' THEN
  SELECT owner_id,title INTO owner,title_value FROM public.help_requests WHERE id=p_id AND status='pending_review' AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post is not awaiting review'; END IF;
  UPDATE public.help_requests SET status=CASE WHEN p_approve THEN 'published'::public.request_status ELSE 'rejected'::public.request_status END WHERE id=p_id;
 ELSIF p_kind='listing' THEN
  SELECT owner_id,title INTO owner,title_value FROM public.product_listings WHERE id=p_id AND status='pending_review' AND deleted_at IS NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Post is not awaiting review'; END IF;
  IF p_approve THEN UPDATE public.product_listings SET status='published' WHERE id=p_id; ELSE UPDATE public.product_listings SET status='removed' WHERE id=p_id; END IF;
 ELSE RAISE EXCEPTION 'Invalid post type'; END IF;
 INSERT INTO public.moderation_actions(moderator_id,target_type,target_id,action) VALUES(auth.uid(),p_kind,p_id,CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END);
 INSERT INTO public.notifications(user_id,type,title,body,link) VALUES(owner,'moderation',CASE WHEN p_approve THEN 'Your post is now live' ELSE 'Your post was not approved' END,title_value,CASE WHEN p_kind='request' THEN '/requests/' ELSE '/products/' END||p_id::text);
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id) VALUES(auth.uid(),CASE WHEN p_approve THEN 'review:approved' ELSE 'review:rejected' END,p_kind,p_id);
END $$;
REVOKE ALL ON FUNCTION public.review_goodivo_post(text,uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_goodivo_post(text,uuid,boolean) TO authenticated;