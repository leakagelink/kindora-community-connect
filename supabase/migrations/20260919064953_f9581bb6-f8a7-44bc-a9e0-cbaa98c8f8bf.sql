ALTER TABLE public.help_requests ADD CONSTRAINT help_requests_owner_profile_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.product_listings ADD CONSTRAINT product_listings_owner_profile_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.service_offers ADD CONSTRAINT service_offers_user_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.request_applications ADD CONSTRAINT request_applications_helper_profile_fkey FOREIGN KEY (helper_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.product_interests ADD CONSTRAINT product_interests_user_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewer_profile_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewee_profile_fkey FOREIGN KEY (reviewee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD CONSTRAINT messages_sender_profile_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;