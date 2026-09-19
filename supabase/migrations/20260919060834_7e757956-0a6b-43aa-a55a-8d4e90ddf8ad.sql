-- public read policies must not depend on the security-definer helpers
drop policy "public profiles readable" on public.profiles;
create policy "public profiles readable" on public.profiles for select
  using (deleted_at is null and is_public);
create policy "self and staff read profiles" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));

revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.is_staff(uuid) from anon, public;
revoke execute on function public.is_conversation_participant(uuid, uuid) from anon, public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_staff(uuid) to authenticated, service_role;
grant execute on function public.is_conversation_participant(uuid, uuid) to authenticated, service_role;