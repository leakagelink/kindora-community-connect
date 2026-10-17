CREATE FUNCTION public.withdraw_goodivo_account() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u uuid:=auth.uid();
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('withdraw:'||u::text,0));
 IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=u) THEN RAISE EXCEPTION 'Profile unavailable'; END IF;
 UPDATE public.help_requests SET deleted_at=now(),status='cancelled' WHERE owner_id=u AND deleted_at IS NULL;
 UPDATE public.product_listings SET deleted_at=now(),status='removed' WHERE owner_id=u AND deleted_at IS NULL;
 UPDATE public.service_offers SET deleted_at=now(),is_active=false WHERE user_id=u AND deleted_at IS NULL;
 UPDATE public.profiles SET deleted_at=now(),is_public=false,is_available=false,display_name='Deleted member',bio=NULL,avatar_url=NULL,skills='{}',interests='{}',languages='{}',city=NULL,country=NULL,portfolio_links='{}' WHERE id=u;
 INSERT INTO public.audit_logs(actor_id,action,entity_type) VALUES(u,'account:withdrawn','profile');
END $$;
REVOKE ALL ON FUNCTION public.withdraw_goodivo_account() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.withdraw_goodivo_account() TO authenticated;
CREATE FUNCTION public.can_view_listing_photo(p_name text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT (split_part(p_name,'/',1)=auth.uid()::text) OR public.is_staff(auth.uid()) OR EXISTS(SELECT 1 FROM public.product_listings l WHERE p_name=ANY(l.photos) AND l.deleted_at IS NULL AND l.status IN ('published','reserved','given_away'))
$$;
REVOKE ALL ON FUNCTION public.can_view_listing_photo(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_listing_photo(text) TO anon,authenticated;
ALTER POLICY "listing photos readable by authenticated users" ON storage.objects TO anon,authenticated USING(bucket_id='listing-photos' AND public.can_view_listing_photo(name));
ALTER POLICY "users upload listing photos to their own folder" ON storage.objects WITH CHECK(bucket_id='listing-photos' AND (storage.foldername(name))[1]=auth.uid()::text AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp'));
ALTER POLICY "users update their own listing photos" ON storage.objects WITH CHECK(bucket_id='listing-photos' AND (storage.foldername(name))[1]=auth.uid()::text AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp'));