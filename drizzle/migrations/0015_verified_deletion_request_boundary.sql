REVOKE EXECUTE ON FUNCTION public.request_goodivo_account_deletion() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.request_goodivo_account_deletion() TO service_role;
CREATE FUNCTION public.record_verified_deletion_request(p_user uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid;
BEGIN
 IF p_user IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=p_user) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 INSERT INTO public.account_deletion_requests(user_id) VALUES(p_user) ON CONFLICT(user_id) DO UPDATE SET updated_at=now() RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.record_verified_deletion_request(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_verified_deletion_request(uuid) TO service_role;