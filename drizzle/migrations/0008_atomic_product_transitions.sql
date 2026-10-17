CREATE FUNCTION public.manage_product(p_listing_id uuid,p_status text,p_interest_id uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE l public.product_listings; i public.product_interests; u uuid:=auth.uid();
BEGIN
 IF u IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=u AND deleted_at IS NULL AND NOT is_restricted AND (suspended_until IS NULL OR suspended_until<=now())) THEN RAISE EXCEPTION 'Account unavailable'; END IF;
 SELECT * INTO l FROM public.product_listings WHERE id=p_listing_id FOR UPDATE;
 IF NOT FOUND OR l.deleted_at IS NOT NULL OR (l.owner_id<>u AND NOT public.is_staff(u)) THEN RAISE EXCEPTION 'Donor access required'; END IF;
 IF p_status IS NULL THEN RAISE EXCEPTION 'Status required'; END IF;
 IF p_interest_id IS NOT NULL THEN
  SELECT * INTO i FROM public.product_interests WHERE id=p_interest_id AND listing_id=l.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Interest unavailable'; END IF;
  IF p_status='reserved' AND l.status='published' AND i.status='pending' THEN
   UPDATE public.product_interests SET status='reserved' WHERE id=i.id;
   UPDATE public.product_listings SET status='reserved' WHERE id=l.id;
  ELSIF p_status='completed' AND l.status='reserved' AND i.status='reserved' THEN
   UPDATE public.product_interests SET status='completed' WHERE id=i.id;
   UPDATE public.product_interests SET status='declined' WHERE listing_id=l.id AND id<>i.id AND status='pending';
   UPDATE public.product_listings SET status='given_away' WHERE id=l.id;
  ELSIF p_status='declined' AND i.status='pending' THEN UPDATE public.product_interests SET status='declined' WHERE id=i.id;
  ELSE RAISE EXCEPTION 'Invalid interest transition'; END IF;
 ELSE
  IF p_status='published' AND l.status='reserved' THEN UPDATE public.product_interests SET status='pending' WHERE listing_id=l.id AND status='reserved';
  ELSIF p_status IN ('removed','expired') AND l.status IN ('pending_review','published','reserved') THEN UPDATE public.product_interests SET status='declined' WHERE listing_id=l.id AND status IN ('pending','reserved');
  ELSIF p_status='given_away' AND l.status IN ('published','reserved') THEN UPDATE public.product_interests SET status=CASE WHEN status='reserved' THEN 'completed'::public.interest_status ELSE 'declined'::public.interest_status END WHERE listing_id=l.id AND status IN ('pending','reserved');
  ELSE RAISE EXCEPTION 'Invalid listing transition'; END IF;
  UPDATE public.product_listings SET status=p_status::public.listing_status WHERE id=l.id;
 END IF;
 INSERT INTO public.audit_logs(actor_id,action,entity_type,entity_id,metadata) VALUES(u,'product:'||p_status,'product_listing',l.id,jsonb_build_object('interest_id',p_interest_id));
END $$;
REVOKE ALL ON FUNCTION public.manage_product(uuid,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_product(uuid,text,uuid) TO authenticated;
CREATE FUNCTION public.guard_product_state() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF current_user='authenticated' AND NOT public.is_staff(auth.uid()) AND new.status IS DISTINCT FROM old.status THEN RAISE EXCEPTION 'Use the authorized product action'; END IF;
 RETURN new;
END $$;
CREATE TRIGGER guard_listing_state BEFORE UPDATE ON public.product_listings FOR EACH ROW EXECUTE FUNCTION public.guard_product_state();
CREATE TRIGGER guard_interest_state BEFORE UPDATE ON public.product_interests FOR EACH ROW EXECUTE FUNCTION public.guard_product_state();
REVOKE ALL ON FUNCTION public.guard_product_state() FROM PUBLIC,anon,authenticated;