CREATE FUNCTION public.sync_request_offer_state() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.help_requests;
BEGIN
 SELECT * INTO r FROM public.help_requests WHERE id=new.request_id FOR UPDATE;
 IF TG_OP='INSERT' THEN
  IF r.status='published' THEN UPDATE public.help_requests SET status='receiving_offers',offers_count=offers_count+1 WHERE id=r.id; ELSE UPDATE public.help_requests SET offers_count=offers_count+1 WHERE id=r.id; END IF;
 ELSIF new.status='accepted' AND old.status<>'accepted' THEN
  IF r.status NOT IN ('published','receiving_offers') OR EXISTS(SELECT 1 FROM public.request_applications WHERE request_id=r.id AND id<>new.id AND status='accepted') THEN RAISE EXCEPTION 'Request already assigned or closed'; END IF;
  UPDATE public.help_requests SET status='in_progress' WHERE id=r.id;
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER sync_request_offer AFTER INSERT OR UPDATE ON public.request_applications FOR EACH ROW EXECUTE FUNCTION public.sync_request_offer_state();
REVOKE ALL ON FUNCTION public.sync_request_offer_state() FROM PUBLIC,anon,authenticated;