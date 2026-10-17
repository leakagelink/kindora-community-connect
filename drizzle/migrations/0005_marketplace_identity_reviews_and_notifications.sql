CREATE FUNCTION public.guard_community_identity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
  IF TG_TABLE_NAME='help_requests' AND (new.owner_id IS DISTINCT FROM old.owner_id OR new.id IS DISTINCT FROM old.id) THEN RAISE EXCEPTION 'Request ownership cannot change'; END IF;
  IF TG_TABLE_NAME='product_listings' AND (new.owner_id IS DISTINCT FROM old.owner_id OR new.id IS DISTINCT FROM old.id) THEN RAISE EXCEPTION 'Listing ownership cannot change'; END IF;
  IF TG_TABLE_NAME='service_offers' AND (new.user_id IS DISTINCT FROM old.user_id OR new.id IS DISTINCT FROM old.id) THEN RAISE EXCEPTION 'Offer ownership cannot change'; END IF;
  IF TG_TABLE_NAME='request_applications' THEN
   IF new.helper_id IS DISTINCT FROM old.helper_id OR new.request_id IS DISTINCT FROM old.request_id OR new.id IS DISTINCT FROM old.id THEN RAISE EXCEPTION 'Application identity cannot change'; END IF;
   IF current_user='authenticated' AND NOT public.is_staff(auth.uid()) AND new.status IS DISTINCT FROM old.status AND NOT EXISTS(SELECT 1 FROM public.help_requests WHERE id=old.request_id AND owner_id=auth.uid()) AND new.status<>'withdrawn' THEN RAISE EXCEPTION 'Only owner may decide offers'; END IF;
  END IF;
  IF TG_TABLE_NAME='product_interests' AND (new.user_id IS DISTINCT FROM old.user_id OR new.listing_id IS DISTINCT FROM old.listing_id OR new.id IS DISTINCT FROM old.id) THEN RAISE EXCEPTION 'Interest identity cannot change'; END IF;
  IF TG_TABLE_NAME='reviews' AND (new.reviewer_id IS DISTINCT FROM old.reviewer_id OR new.reviewee_id IS DISTINCT FROM old.reviewee_id OR new.request_id IS DISTINCT FROM old.request_id OR new.listing_id IS DISTINCT FROM old.listing_id OR new.id IS DISTINCT FROM old.id) THEN RAISE EXCEPTION 'Review identity cannot change'; END IF;
 END IF;
 IF current_user='authenticated' AND NOT public.is_staff(auth.uid()) THEN
  IF TG_TABLE_NAME='help_requests' THEN
   IF TG_OP='INSERT' AND new.status NOT IN ('draft','pending_review') THEN RAISE EXCEPTION 'Request requires moderation'; END IF;
   IF TG_OP='UPDATE' AND (new.moderation_note IS DISTINCT FROM old.moderation_note OR (old.status IN ('draft','pending_review','rejected') AND new.status NOT IN ('draft','pending_review','cancelled'))) THEN RAISE EXCEPTION 'Request requires moderation'; END IF;
  ELSIF TG_TABLE_NAME='product_listings' THEN
   IF TG_OP='INSERT' AND new.status<>'pending_review' THEN RAISE EXCEPTION 'Listing requires moderation'; END IF;
   IF TG_OP='UPDATE' AND (new.moderation_note IS DISTINCT FROM old.moderation_note OR (old.status='pending_review' AND new.status NOT IN ('pending_review','removed'))) THEN RAISE EXCEPTION 'Listing requires moderation'; END IF;
  ELSIF TG_TABLE_NAME='request_applications' AND TG_OP='INSERT' THEN
   IF new.status<>'pending' OR NOT new.no_payment_confirmed OR NOT EXISTS(SELECT 1 FROM public.help_requests WHERE id=new.request_id AND owner_id<>auth.uid() AND deleted_at IS NULL AND status IN ('published','receiving_offers')) THEN RAISE EXCEPTION 'Request is not accepting offers'; END IF;
  ELSIF TG_TABLE_NAME='product_interests' AND TG_OP='INSERT' THEN
   IF new.status<>'pending' OR NOT EXISTS(SELECT 1 FROM public.product_listings WHERE id=new.listing_id AND owner_id<>auth.uid() AND deleted_at IS NULL AND status='published') THEN RAISE EXCEPTION 'Item is not available'; END IF;
  ELSIF TG_TABLE_NAME='reviews' THEN
   IF new.is_hidden THEN RAISE EXCEPTION 'Moderation field is protected'; END IF;
   IF TG_OP='INSERT' THEN
    IF new.reviewer_id=new.reviewee_id OR (new.request_id IS NULL)=(new.listing_id IS NULL) THEN RAISE EXCEPTION 'One completed engagement required'; END IF;
    IF new.request_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.help_requests r JOIN public.request_applications a ON a.request_id=r.id AND a.status='accepted' WHERE r.id=new.request_id AND r.status='completed' AND ((r.owner_id=new.reviewer_id AND a.helper_id=new.reviewee_id) OR (r.owner_id=new.reviewee_id AND a.helper_id=new.reviewer_id))) THEN RAISE EXCEPTION 'Completed request parties required'; END IF;
    IF new.listing_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.product_listings l JOIN public.product_interests i ON i.listing_id=l.id AND i.status='completed' WHERE l.id=new.listing_id AND l.status='given_away' AND ((l.owner_id=new.reviewer_id AND i.user_id=new.reviewee_id) OR (l.owner_id=new.reviewee_id AND i.user_id=new.reviewer_id))) THEN RAISE EXCEPTION 'Completed product parties required'; END IF;
   END IF;
  END IF;
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER guard_request_identity BEFORE INSERT OR UPDATE ON public.help_requests FOR EACH ROW EXECUTE FUNCTION public.guard_community_identity();
CREATE TRIGGER guard_listing_identity BEFORE INSERT OR UPDATE ON public.product_listings FOR EACH ROW EXECUTE FUNCTION public.guard_community_identity();
CREATE TRIGGER guard_offer_identity BEFORE INSERT OR UPDATE ON public.service_offers FOR EACH ROW EXECUTE FUNCTION public.guard_community_identity();
CREATE TRIGGER guard_application_identity BEFORE INSERT OR UPDATE ON public.request_applications FOR EACH ROW EXECUTE FUNCTION public.guard_community_identity();
CREATE TRIGGER guard_interest_identity BEFORE INSERT OR UPDATE ON public.product_interests FOR EACH ROW EXECUTE FUNCTION public.guard_community_identity();
CREATE TRIGGER guard_review_identity BEFORE INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.guard_community_identity();
CREATE FUNCTION public.notify_community_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE recipient uuid; route text; title text;
BEGIN
 IF TG_TABLE_NAME='request_applications' THEN
  route:='/requests/'||new.request_id;
  IF TG_OP='INSERT' THEN SELECT owner_id INTO recipient FROM public.help_requests WHERE id=new.request_id; title:='New offer of help'; ELSE IF new.status IS NOT DISTINCT FROM old.status THEN RETURN new; END IF; recipient:=new.helper_id; title:='Your help offer was updated'; END IF;
 ELSIF TG_TABLE_NAME='product_interests' THEN
  route:='/products/'||new.listing_id;
  IF TG_OP='INSERT' THEN SELECT owner_id INTO recipient FROM public.product_listings WHERE id=new.listing_id; title:='New interest in your item'; ELSE IF new.status IS NOT DISTINCT FROM old.status THEN RETURN new; END IF; recipient:=new.user_id; title:='Your item request was updated'; END IF;
 ELSIF TG_TABLE_NAME='reviews' THEN recipient:=new.reviewee_id; route:='/u/'||recipient; title:='New feedback received';
 END IF;
 IF recipient IS NOT NULL THEN INSERT INTO public.notifications(user_id,type,title,link) VALUES(recipient,'community',title,route); END IF;
 RETURN new;
END $$;
CREATE TRIGGER notify_application_event AFTER INSERT OR UPDATE ON public.request_applications FOR EACH ROW EXECUTE FUNCTION public.notify_community_event();
CREATE TRIGGER notify_interest_event AFTER INSERT OR UPDATE ON public.product_interests FOR EACH ROW EXECUTE FUNCTION public.notify_community_event();
CREATE TRIGGER notify_review_event AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.notify_community_event();
REVOKE ALL ON FUNCTION public.guard_community_identity(),public.notify_community_event() FROM PUBLIC,anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.ai_generations FROM authenticated;