CREATE TABLE public.socilet_offer_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, offer_key text NOT NULL CHECK(offer_key IN ('logo','domain','hosting')), payload jsonb NOT NULL,
 status text NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted','under_review','more_information_required','approved','delivered','rejected')),
 terms_version text NOT NULL DEFAULT '2026-10-17-offers-v1', review_note text, reviewed_by uuid, awarded_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(offer_key,user_id)
);
GRANT SELECT ON public.socilet_offer_applications TO authenticated;
GRANT ALL ON public.socilet_offer_applications TO service_role;
ALTER TABLE public.socilet_offer_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applicants read own offers" ON public.socilet_offer_applications FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "Admins read offers" ON public.socilet_offer_applications FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE UNIQUE INDEX socilet_offer_email_unique ON public.socilet_offer_applications(offer_key,lower(payload->>'email'));
CREATE INDEX socilet_offer_review_order ON public.socilet_offer_applications(offer_key,created_at DESC);
CREATE FUNCTION public.submit_socilet_offer(p_offer text,p_payload jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.socilet_offer_applications; cap int; k text; minlen int; maxlen int; v text; cleaned jsonb := '{}'::jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_offer IS NULL OR p_offer NOT IN ('logo','domain','hosting') THEN RAISE EXCEPTION 'Invalid offer'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('socilet-offer:'||p_offer,0));
 SELECT * INTO result FROM public.socilet_offer_applications WHERE user_id=auth.uid() AND offer_key=p_offer;
 IF FOUND THEN RETURN to_jsonb(result); END IF;
 IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR p_payload->'terms_accepted' IS DISTINCT FROM 'true'::jsonb OR p_payload->'contact_consent' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'Terms and consent required'; END IF;
 FOR k,minlen,maxlen IN SELECT * FROM (VALUES ('full_name',2,100),('business_name',2,150),('email',5,255),('brief',40,4000),('reason',20,2000)) AS limits(k,a,b) LOOP
  IF jsonb_typeof(p_payload->k) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'Invalid application field'; END IF;
  v:=btrim(p_payload->>k);
  IF length(v) NOT BETWEEN minlen AND maxlen THEN RAISE EXCEPTION 'Invalid application field length'; END IF;
  cleaned:=cleaned||jsonb_build_object(k,CASE WHEN k='email' THEN lower(v) ELSE v END);
 END LOOP;
 IF cleaned->>'email' !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'Invalid email'; END IF;
 cap:=CASE WHEN p_offer='domain' THEN 200 ELSE 100 END;
 IF (SELECT count(*) FROM public.socilet_offer_applications WHERE offer_key=p_offer)>=cap THEN RAISE EXCEPTION 'Application limit reached'; END IF;
 cleaned:=cleaned||jsonb_build_object('terms_accepted',true,'contact_consent',true);
 INSERT INTO public.socilet_offer_applications(user_id,offer_key,payload) VALUES(auth.uid(),p_offer,cleaned) RETURNING * INTO result;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES(auth.uid(),'socilet_offer:submitted','socilet_offer_application',result.id,jsonb_build_object('offer',p_offer));
 RETURN to_jsonb(result);
END $$;
REVOKE ALL ON FUNCTION public.submit_socilet_offer(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_socilet_offer(text,jsonb) TO authenticated;
CREATE FUNCTION public.review_socilet_offer(p_id uuid,p_status text,p_note text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result public.socilet_offer_applications; cap int; offer text;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator access required'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('submitted','under_review','more_information_required','approved','delivered','rejected') OR p_note IS NULL OR length(btrim(p_note)) NOT BETWEEN 5 AND 2000 THEN RAISE EXCEPTION 'Invalid review'; END IF;
 SELECT offer_key INTO offer FROM public.socilet_offer_applications WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('socilet-offer:'||offer,0));
 SELECT * INTO result FROM public.socilet_offer_applications WHERE id=p_id FOR UPDATE;
 IF result.status='delivered' AND p_status<>'delivered' THEN RAISE EXCEPTION 'Delivered award cannot be reopened'; END IF;
 IF result.awarded_at IS NOT NULL AND p_status NOT IN ('approved','delivered') THEN RAISE EXCEPTION 'Allocated award cannot be removed'; END IF;
 IF p_status='delivered' AND result.awarded_at IS NULL THEN RAISE EXCEPTION 'Approve before delivery'; END IF;
 cap:=CASE WHEN offer='logo' THEN 100 ELSE 50 END;
 IF p_status='approved' AND result.awarded_at IS NULL AND (SELECT count(*) FROM public.socilet_offer_applications WHERE offer_key=offer AND awarded_at IS NOT NULL)>=cap THEN RAISE EXCEPTION 'Award limit reached'; END IF;
 UPDATE public.socilet_offer_applications SET status=p_status,review_note=btrim(p_note),reviewed_by=auth.uid(),awarded_at=CASE WHEN p_status='approved' THEN coalesce(awarded_at,now()) ELSE awarded_at END,updated_at=now() WHERE id=p_id;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES(auth.uid(),'socilet_offer:reviewed','socilet_offer_application',p_id,jsonb_build_object('offer',offer,'old_status',result.status,'status',p_status));
END $$;
REVOKE ALL ON FUNCTION public.review_socilet_offer(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.review_socilet_offer(uuid,text,text) TO authenticated;