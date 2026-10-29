CREATE POLICY conversation_insert_rpc_only ON public.conversations AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(false);
CREATE POLICY participant_insert_rpc_only ON public.conversation_participants AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(false);
CREATE FUNCTION public.guard_request_lifecycle() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
 IF current_user<>'authenticated' OR public.is_staff(auth.uid()) THEN RETURN new; END IF;
 IF new.owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Request owner required'; END IF;
 IF TG_OP='INSERT' THEN
  IF new.status NOT IN ('draft','pending_review') OR new.offers_count IS DISTINCT FROM 0 OR new.moderation_note IS NOT NULL OR new.deleted_at IS NOT NULL THEN RAISE EXCEPTION 'Invalid initial request state'; END IF;
  new.created_at:=clock_timestamp(); RETURN new;
 END IF;
 IF new.created_at IS DISTINCT FROM old.created_at OR new.offers_count IS DISTINCT FROM old.offers_count OR new.moderation_note IS DISTINCT FROM old.moderation_note OR new.deleted_at IS DISTINCT FROM old.deleted_at THEN RAISE EXCEPTION 'Protected request fields'; END IF;
 IF new.status IS DISTINCT FROM old.status AND NOT ((old.status='draft' AND new.status IN ('pending_review','cancelled')) OR (old.status='pending_review' AND new.status IN ('draft','cancelled')) OR (old.status='rejected' AND new.status IN ('draft','pending_review','cancelled')) OR (old.status IN ('published','receiving_offers','in_progress') AND new.status='cancelled') OR (old.status='in_progress' AND new.status='completed') OR (old.status='completed' AND new.status='closed')) THEN RAISE EXCEPTION 'Invalid request lifecycle transition'; END IF;
 RETURN new;
END $$;
CREATE TRIGGER guard_request_lifecycle BEFORE INSERT OR UPDATE ON public.help_requests FOR EACH ROW EXECUTE FUNCTION public.guard_request_lifecycle();
REVOKE ALL ON FUNCTION public.guard_request_lifecycle() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.sync_request_offer_state() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.help_requests;
BEGIN
 SELECT * INTO r FROM public.help_requests WHERE id=new.request_id FOR UPDATE;
 IF TG_OP='INSERT' THEN
  IF r.id IS NULL OR r.deleted_at IS NOT NULL OR r.status NOT IN ('published','receiving_offers') THEN RAISE EXCEPTION 'Request is not accepting offers'; END IF;
  UPDATE public.help_requests SET status='receiving_offers',offers_count=offers_count+1 WHERE id=r.id;
 ELSIF new.status='accepted' AND old.status<>'accepted' THEN
  IF r.deleted_at IS NOT NULL OR r.status NOT IN ('published','receiving_offers') OR EXISTS(SELECT 1 FROM public.request_applications WHERE request_id=r.id AND id<>new.id AND status='accepted') THEN RAISE EXCEPTION 'Request already assigned or closed'; END IF;
  UPDATE public.help_requests SET status='in_progress' WHERE id=r.id;
 END IF;
 RETURN new;
END $$;
REVOKE ALL ON FUNCTION public.sync_request_offer_state() FROM PUBLIC,anon,authenticated;
CREATE TABLE public.account_deletion_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL UNIQUE,status text NOT NULL DEFAULT 'requested' CHECK(status IN ('requested','processing','blocked','completed')),requested_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),processing_note text);
GRANT SELECT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY deletion_request_owner_read ON public.account_deletion_requests FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE FUNCTION public.request_goodivo_account_deletion() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid()) THEN RAISE EXCEPTION 'Verified sign-in required'; END IF;
 INSERT INTO public.account_deletion_requests(user_id) VALUES(auth.uid()) ON CONFLICT(user_id) DO UPDATE SET updated_at=now() RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.request_goodivo_account_deletion() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_goodivo_account_deletion() TO authenticated;