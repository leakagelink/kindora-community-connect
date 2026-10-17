CREATE TABLE public.campaign_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, campaign_key text NOT NULL DEFAULT 'socilet50', payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','approved','rejected','more_information_required')),
 terms_version text NOT NULL DEFAULT '2026-10-17', review_note text, reviewed_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (campaign_key,user_id), CHECK (campaign_key='socilet50')
);
GRANT SELECT ON public.campaign_applications TO authenticated;
GRANT ALL ON public.campaign_applications TO service_role;
ALTER TABLE public.campaign_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applicants read own campaign applications" ON public.campaign_applications FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE POLICY "Admins read campaign applications" ON public.campaign_applications FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX campaign_contact_email_unique ON public.campaign_applications(campaign_key,lower(payload->>'email'));
CREATE INDEX campaign_review_order ON public.campaign_applications(campaign_key,created_at DESC);
CREATE FUNCTION public.submit_socilet_application(p_payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing public.campaign_applications; result public.campaign_applications; k text; n int; v text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':socilet50',0));
 SELECT * INTO existing FROM public.campaign_applications WHERE user_id=auth.uid() AND campaign_key='socilet50';
 IF FOUND THEN RETURN to_jsonb(existing); END IF;
 IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR p_payload->'terms_accepted' IS DISTINCT FROM 'true'::jsonb OR p_payload->'contact_consent' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Terms and consent required'; END IF;
 FOR k,n IN SELECT * FROM (VALUES ('full_name',100),('business_name',150),('email',255),('mobile',25),('website',500),('category',100),('description',4000),('scope',1000),('reason',2000)) AS limits(key,maxlen) LOOP
  IF jsonb_typeof(p_payload->k) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Invalid application field'; END IF;
  v:=btrim(p_payload->>k);
  IF length(v)>n OR (k<>'website' AND length(v)<2) THEN RAISE EXCEPTION 'Invalid application field length'; END IF;
 END LOOP;
 IF length(btrim(p_payload->>'description'))<40 OR length(btrim(p_payload->>'scope'))<10 OR length(btrim(p_payload->>'reason'))<20 THEN RAISE EXCEPTION 'Insufficient application details'; END IF;
 IF p_payload->>'service' NOT IN ('Website','Web App','Mobile App','Other') OR p_payload->>'service' IS NULL THEN RAISE EXCEPTION 'Invalid service'; END IF;
 IF p_payload->>'email' !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Invalid email'; END IF;
 IF p_payload->>'mobile' !~ '^\+?[0-9 ()-]{7,25}$' OR length(regexp_replace(p_payload->>'mobile','[^0-9]','','g')) NOT BETWEEN 7 AND 15 THEN RAISE EXCEPTION 'Invalid mobile'; END IF;
 IF p_payload->>'website'<>'' AND p_payload->>'website' !~* '^https?://[^[:space:]]+$' THEN RAISE EXCEPTION 'Invalid website'; END IF;
 INSERT INTO public.campaign_applications(user_id,payload) VALUES(auth.uid(),jsonb_build_object('full_name',btrim(p_payload->>'full_name'),'business_name',btrim(p_payload->>'business_name'),'email',lower(btrim(p_payload->>'email')),'mobile',btrim(p_payload->>'mobile'),'website',btrim(p_payload->>'website'),'category',btrim(p_payload->>'category'),'service',p_payload->>'service','description',btrim(p_payload->>'description'),'scope',btrim(p_payload->>'scope'),'reason',btrim(p_payload->>'reason'),'terms_accepted',true,'contact_consent',true)) RETURNING * INTO result;
 RETURN to_jsonb(result);
END $$;
REVOKE ALL ON FUNCTION public.submit_socilet_application(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_socilet_application(jsonb) TO authenticated;
CREATE FUNCTION public.review_socilet_application(p_id uuid,p_status text,p_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_status text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF p_status NOT IN ('submitted','under_review','approved','rejected','more_information_required') OR p_status IS NULL OR length(btrim(p_note)) NOT BETWEEN 5 AND 2000 THEN RAISE EXCEPTION 'Invalid review'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('socilet50:approvals',0));
 SELECT status INTO old_status FROM public.campaign_applications WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
 IF p_status='approved' AND old_status<>'approved' AND (SELECT count(*) FROM public.campaign_applications WHERE campaign_key='socilet50' AND status='approved')>=50 THEN RAISE EXCEPTION '50 approval limit reached'; END IF;
 UPDATE public.campaign_applications SET status=p_status,review_note=btrim(p_note),reviewed_by=auth.uid(),updated_at=now() WHERE id=p_id;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES(auth.uid(),'campaign:reviewed','campaign_application',p_id,jsonb_build_object('old_status',old_status,'status',p_status));
END $$;
REVOKE ALL ON FUNCTION public.review_socilet_application(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_socilet_application(uuid,text,text) TO authenticated;