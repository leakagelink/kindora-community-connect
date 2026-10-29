ALTER POLICY "flags readable" ON public.feature_flags TO authenticated USING(public.has_role(auth.uid(),'admin'));
ALTER POLICY "limits readable" ON public.ai_usage_limits TO authenticated USING(public.has_role(auth.uid(),'admin'));
REVOKE SELECT ON public.feature_flags,public.ai_usage_limits FROM anon;
CREATE FUNCTION public.goodivo_public_flags() RETURNS TABLE(key text,is_enabled boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT f.key,f.is_enabled FROM public.feature_flags f WHERE f.key IN ('donations','ai_logo_maker','ai_resume_builder','ai_website_starter','messaging_attachments','product_marketplace','new_categories','experimental','rewarded_ads','interstitial_ads'); $$;
REVOKE ALL ON FUNCTION public.goodivo_public_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.goodivo_public_flags() TO anon,authenticated;
CREATE FUNCTION public.goodivo_public_ai_limits() RETURNS TABLE(tool text,daily_limit integer,is_enabled boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT l.tool,l.daily_limit,l.is_enabled FROM public.ai_usage_limits l WHERE l.tool IN ('logo_maker','resume_builder','website_starter'); $$;
REVOKE ALL ON FUNCTION public.goodivo_public_ai_limits() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.goodivo_public_ai_limits() TO anon,authenticated;