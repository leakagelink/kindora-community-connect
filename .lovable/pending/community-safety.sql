-- Additive extension. Apply only after live schema inspection and healthy Cloud status.
create table if not exists public.community_tasks (
 id uuid primary key default gen_random_uuid(), title text not null, purpose text not null,
 kind text not null check(kind in ('profile','request_details','eligibility','onboarding','feedback')),
 actions text not null, eligibility text not null, privacy text not null,
 reward text not null default 'None. No product or service is guaranteed.',
 is_active boolean not null default true, version integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
grant select on public.community_tasks to authenticated;
grant all on public.community_tasks to service_role;
alter table public.community_tasks enable row level security;
create policy "active tasks or admin" on public.community_tasks for select to authenticated using(is_active or public.has_role(auth.uid(),'admin'));
create table if not exists public.task_submissions (
 id uuid primary key default gen_random_uuid(), task_id uuid not null references public.community_tasks(id),
 user_id uuid not null, task_version integer not null, entity_key text not null default '',
 evidence jsonb not null default '{}', status text not null check(status in ('pending_review','completed','rejected')),
 review_note text, reviewed_by uuid, created_at timestamptz not null default now(), reviewed_at timestamptz,
 unique(task_id,user_id,task_version,entity_key)
);
grant select on public.task_submissions to authenticated;
grant all on public.task_submissions to service_role;
alter table public.task_submissions enable row level security;
create policy "own tasks or admin" on public.task_submissions for select to authenticated using(user_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create index task_submissions_user_idx on public.task_submissions(user_id,created_at desc);
create table if not exists public.restriction_appeals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, reason text not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 response text, reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz not null default now()
);
grant select on public.restriction_appeals to authenticated;
grant all on public.restriction_appeals to service_role;
alter table public.restriction_appeals enable row level security;
create policy "own appeals or admin" on public.restriction_appeals for select to authenticated using(user_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create unique index one_pending_appeal_idx on public.restriction_appeals(user_id) where status='pending';
create table if not exists public.reward_events (
 id uuid primary key default gen_random_uuid(), user_id uuid not null, provider text not null,
 provider_event_id text not null, status text not null default 'pending' check(status in ('pending','verified','rejected')),
 credits integer not null default 0 check(credits between 0 and 1),
 created_at timestamptz not null default now(), unique(provider,provider_event_id)
);
grant select on public.reward_events to authenticated;
grant all on public.reward_events to service_role;
alter table public.reward_events enable row level security;
create policy "own reward events or admin" on public.reward_events for select to authenticated using(user_id=auth.uid() or public.has_role(auth.uid(),'admin'));
-- No grant function or ad endpoint exists until an approved provider is configured.
alter table public.ai_usage_limits add column if not exists global_daily_limit integer not null default 100;
alter table public.ai_usage_limits add column if not exists daily_budget_usd numeric not null default 5;
alter table public.ai_usage_limits add column if not exists estimated_cost_per_run_usd numeric not null default 0.05;
alter table public.ai_generations add column if not exists estimated_cost_usd numeric not null default 0;
alter table public.ai_generations add column if not exists input_tokens integer;
alter table public.ai_generations add column if not exists output_tokens integer;
-- Reserve before calling the provider. History is no longer user-writable/deletable.
revoke insert,delete,update on public.ai_generations from authenticated;
grant insert,update,delete on public.user_roles,public.categories to authenticated;
grant update on public.feature_flags,public.ai_usage_limits to authenticated;

create or replace function public.submit_community_task(p_task_id uuid,p_evidence jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare t public.community_tasks; p public.profiles; r public.help_requests; s text; k text := ''; result public.task_submissions; u uuid := auth.uid();
begin
 if u is null then raise exception 'Sign in required'; end if;
 select * into p from public.profiles where id=u;
 if not found or p.deleted_at is not null or p.is_restricted or p.suspended_until>now() then raise exception 'Account unavailable or restricted'; end if;
 perform pg_advisory_xact_lock(hashtextextended('tasks:'||u::text,0));
 if (select count(*) from public.task_submissions where user_id=u and created_at>now()-interval '1 minute')>=5 then raise exception 'Please wait before submitting another task'; end if;
 select * into t from public.community_tasks where id=p_task_id and is_active;
 if not found then raise exception 'Task unavailable'; end if;
 if jsonb_typeof(p_evidence)<>'object' or length(p_evidence::text)>8000 then raise exception 'Invalid evidence'; end if;
 s := 'completed';
 if t.kind='profile' then
  if length(trim(p.display_name))<2 or length(trim(coalesce(p.bio,'')))<20 or cardinality(p.skills)=0 or cardinality(p.languages)=0 then raise exception 'Save a display name, bio (20 characters), skills and languages first'; end if;
  p_evidence := jsonb_build_object('verified_fields','display name, bio, skills, languages');
 elsif t.kind='request_details' then
  select * into r from public.help_requests where id=(p_evidence->>'request_id')::uuid and owner_id=u and deleted_at is null;
  if not found then raise exception 'Your request was not found'; end if;
  if length(trim(r.title))<8 or length(trim(r.description))<40 or r.category_id is null or r.needed_by is null or (not r.is_remote and length(trim(coalesce(r.location,'')))<2) then raise exception 'Save the missing request information first'; end if;
  k := r.id::text; p_evidence := jsonb_build_object('request_id',k);
 elsif t.kind='onboarding' then
  if p_evidence->>'payment' is distinct from 'never_required' or p_evidence->>'fulfilment' is distinct from 'volunteer_availability' or p_evidence->>'privacy' is distinct from 'keep_private' then raise exception 'Please review the community rules'; end if;
 elsif t.kind='eligibility' then
  if length(trim(coalesce(p_evidence->>'details','')))<40 or p_evidence->>'accuracy' is distinct from 'yes' then raise exception 'Add accurate eligibility details'; end if;
  s := 'pending_review';
 elsif t.kind='feedback' then
  if length(trim(coalesce(p_evidence->>'feedback','')))<20 then raise exception 'Add at least 20 characters of feedback'; end if;
  s := 'pending_review';
 else raise exception 'Unsupported task'; end if;
 insert into public.task_submissions(task_id,user_id,task_version,entity_key,evidence,status) values(t.id,u,t.version,k,p_evidence,s) returning * into result;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(u,'task:submitted','task_submission',result.id);
 return jsonb_build_object('status',s,'id',result.id);
exception when unique_violation then raise exception 'This task has already been submitted';
end $$;
revoke all on function public.submit_community_task(uuid,jsonb) from public,anon;
grant execute on function public.submit_community_task(uuid,jsonb) to authenticated;

create or replace function public.save_community_task(p_definition jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare k text := p_definition->>'kind'; task_id uuid;
begin
 if not public.has_role(auth.uid(),'admin') then raise exception 'Administrator access required'; end if;
 if k not in ('profile','request_details','eligibility','onboarding','feedback') then raise exception 'Unsupported task type'; end if;
 if length(trim(coalesce(p_definition->>'title','')))<5 or length(trim(coalesce(p_definition->>'purpose','')))<20 or length(trim(coalesce(p_definition->>'actions','')))<20 or length(trim(coalesce(p_definition->>'eligibility','')))<10 or length(trim(coalesce(p_definition->>'privacy','')))<10 then raise exception 'Complete all task disclosures'; end if;
 if p_definition->>'id' is not null then
  update public.community_tasks set title=p_definition->>'title',purpose=p_definition->>'purpose',kind=k,actions=p_definition->>'actions',eligibility=p_definition->>'eligibility',privacy=p_definition->>'privacy',is_active=(p_definition->>'is_active')::boolean,updated_at=now() where id=(p_definition->>'id')::uuid returning id into task_id;
  if task_id is null then raise exception 'Task not found'; end if;
 else
  insert into public.community_tasks(title,purpose,kind,actions,eligibility,privacy,is_active) values(p_definition->>'title',p_definition->>'purpose',k,p_definition->>'actions',p_definition->>'eligibility',p_definition->>'privacy',(p_definition->>'is_active')::boolean) returning id into task_id;
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(auth.uid(),'task:definition_saved','community_task',task_id);
end $$;
revoke all on function public.save_community_task(jsonb) from public,anon;
grant execute on function public.save_community_task(jsonb) to authenticated;

create or replace function public.submit_restriction_appeal(p_reason text)
returns void language plpgsql security definer set search_path=public as $$
declare p public.profiles;
begin
 if auth.uid() is null or length(trim(p_reason))<40 or length(p_reason)>2000 then raise exception 'Add an appeal explanation (40–2000 characters)'; end if;
 select * into p from public.profiles where id=auth.uid();
 if not found or (not p.is_restricted and coalesce(p.suspended_until,now())<=now()) then raise exception 'Your account is not currently restricted'; end if;
 if (select count(*) from public.restriction_appeals where user_id=auth.uid() and created_at>now()-interval '24 hours')>=3 then raise exception 'Daily appeal limit reached'; end if;
 insert into public.restriction_appeals(user_id,reason) values(auth.uid(),trim(p_reason));
exception when unique_violation then raise exception 'An appeal is already awaiting review';
end $$;
revoke all on function public.submit_restriction_appeal(text) from public,anon;
grant execute on function public.submit_restriction_appeal(text) to authenticated;

create or replace function public.review_platform_submission(p_id uuid,p_type text,p_approved boolean,p_note text)
returns void language plpgsql security definer set search_path=public as $$
declare target_user uuid;
begin
 if not public.has_role(auth.uid(),'admin') then raise exception 'Administrator access required'; end if;
 if length(trim(p_note))<10 or length(p_note)>1000 then raise exception 'A review explanation is required'; end if;
 if p_type='task' then
  update public.task_submissions set status=case when p_approved then 'completed' else 'rejected' end,review_note=p_note,reviewed_by=auth.uid(),reviewed_at=now() where id=p_id and status='pending_review' returning user_id into target_user;
 elsif p_type='appeal' then
  update public.restriction_appeals set status=case when p_approved then 'approved' else 'rejected' end,response=p_note,reviewed_by=auth.uid(),reviewed_at=now() where id=p_id and status='pending' returning user_id into target_user;
  if p_approved and target_user is not null then update public.profiles set is_restricted=false,suspended_until=null where id=target_user; end if;
 else raise exception 'Unknown review type'; end if;
 if target_user is null then raise exception 'Submission unavailable or already reviewed'; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'submission:reviewed',p_type,p_id,jsonb_build_object('approved',p_approved,'note',p_note));
end $$;
revoke all on function public.review_platform_submission(uuid,text,boolean,text) from public,anon;
grant execute on function public.review_platform_submission(uuid,text,boolean,text) to authenticated;

create or replace function public.reserve_ai_generation(p_tool text,p_input jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare l public.ai_usage_limits; u uuid:=auth.uid(); used integer; global_used integer; spent numeric; rid uuid;
begin
 if u is null then raise exception 'Sign in required'; end if;
 if not exists(select 1 from public.profiles where id=u and not is_restricted and deleted_at is null and (suspended_until is null or suspended_until<=now())) then raise exception 'Account unavailable or restricted'; end if;
 if p_tool not in ('logo_maker','resume_builder','website_starter') or jsonb_typeof(p_input)<>'object' or length(p_input::text)>12000 then raise exception 'Invalid AI request'; end if;
 perform pg_advisory_xact_lock(hashtextextended('goodivo:ai:global',0));
 select * into l from public.ai_usage_limits where tool=p_tool;
 if not found or not l.is_enabled or not exists(select 1 from public.feature_flags where key='ai_'||p_tool and is_enabled) then raise exception 'This AI tool is currently unavailable'; end if;
 select count(*) into used from public.ai_generations where user_id=u and tool=p_tool and created_at>now()-interval '24 hours';
 if used>=l.daily_limit then raise exception 'Daily free limit reached'; end if;
 if (select count(*) from public.ai_generations where user_id=u and created_at>now()-interval '1 minute')>=3 then raise exception 'Please wait before generating again'; end if;
 if (select count(*) from public.ai_generations where created_at>now()-interval '1 minute')>=20 then raise exception 'AI service is busy; please try later'; end if;
 select count(*),coalesce(sum(estimated_cost_usd),0) into global_used,spent from public.ai_generations where tool=p_tool and created_at>now()-interval '24 hours';
 if l.global_daily_limit<0 or l.daily_budget_usd<0 or l.estimated_cost_per_run_usd<=0 or global_used>=l.global_daily_limit or spent+l.estimated_cost_per_run_usd>l.daily_budget_usd then raise exception 'This tool has reached its daily capacity'; end if;
 insert into public.ai_generations(user_id,tool,input,model,status,estimated_cost_usd) values(u,p_tool,p_input,'openai/gpt-6-astra','pending',l.estimated_cost_per_run_usd) returning id into rid;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(u,'ai:reserved','ai_generation',rid);
 return jsonb_build_object('id',rid,'dailyLimit',l.daily_limit,'remaining',l.daily_limit-used-1);
end $$;
revoke all on function public.reserve_ai_generation(text,jsonb) from public,anon;
grant execute on function public.reserve_ai_generation(text,jsonb) to authenticated;

create or replace function public.finish_ai_generation(p_id uuid,p_user uuid,p_output jsonb,p_error text,p_input_tokens integer,p_output_tokens integer)
returns void language plpgsql security definer set search_path=public as $$
begin
 update public.ai_generations set output=p_output,status=case when p_error is null then 'succeeded' else 'failed' end,error_message=p_error,input_tokens=p_input_tokens,output_tokens=p_output_tokens where id=p_id and user_id=p_user and status='pending';
 if not found then raise exception 'AI reservation missing or already finalized'; end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id) values(p_user,'ai:finalized','ai_generation',p_id);
end $$;
revoke all on function public.finish_ai_generation(uuid,uuid,jsonb,text,integer,integer) from public,anon,authenticated;
grant execute on function public.finish_ai_generation(uuid,uuid,jsonb,text,integer,integer) to service_role;

create or replace function public.save_ai_budget(p_tool text,p_global_limit integer,p_budget numeric,p_estimate numeric)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.has_role(auth.uid(),'admin') then raise exception 'Administrator access required'; end if;
 if p_global_limit<0 or p_global_limit>100000 or p_budget<0 or p_budget>10000 or p_estimate<=0 or p_estimate>100 then raise exception 'Invalid budget'; end if;
 update public.ai_usage_limits set global_daily_limit=p_global_limit,daily_budget_usd=p_budget,estimated_cost_per_run_usd=p_estimate where tool=p_tool;
 if not found then raise exception 'Unknown AI tool'; end if;
 insert into public.audit_logs(actor_id,action,entity_type,metadata) values(auth.uid(),'ai:budget_updated','ai_usage_limit',jsonb_build_object('tool',p_tool,'budget_usd',p_budget,'global_limit',p_global_limit,'estimate',p_estimate));
end $$;
revoke all on function public.save_ai_budget(text,integer,numeric,numeric) from public,anon;
grant execute on function public.save_ai_budget(text,integer,numeric,numeric) to authenticated;

create or replace function public.platform_operational_metrics()
returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not public.has_role(auth.uid(),'admin') then raise exception 'Administrator access required'; end if;
 return jsonb_build_object('completed_help',(select count(*) from public.help_requests where status='completed'),'fulfilled_products',(select count(*) from public.product_listings where status='given_away'),'pending_task_reviews',(select count(*) from public.task_submissions where status='pending_review'),'pending_appeals',(select count(*) from public.restriction_appeals where status='pending'),'ai_runs_24h',(select count(*) from public.ai_generations where created_at>now()-interval '24 hours'),'estimated_ai_cost_usd_24h',(select coalesce(sum(estimated_cost_usd),0) from public.ai_generations where created_at>now()-interval '24 hours'));
end $$;
revoke all on function public.platform_operational_metrics() from public,anon;
grant execute on function public.platform_operational_metrics() to authenticated;

-- Prevent arbitrary self-enrolment in private conversations, preserving creator setup.
create or replace function public.can_add_conversation_participant(p_id uuid,p_user uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.conversations where id=p_id and created_by=auth.uid())
 and exists(select 1 from public.profiles where id=p_user and deleted_at is null)
 and not exists(select 1 from public.blocked_users where (blocker_id=auth.uid() and blocked_id=p_user) or (blocked_id=auth.uid() and blocker_id=p_user))
$$;
revoke all on function public.can_add_conversation_participant(uuid,uuid) from public,anon;
grant execute on function public.can_add_conversation_participant(uuid,uuid) to authenticated;
alter policy "add participants" on public.conversation_participants with check(public.can_add_conversation_participant(conversation_id,user_id));
-- Privileged profile fields cannot be changed by their owner.
create or replace function public.protect_profile_fields()
returns trigger language plpgsql set search_path=public as $$
begin
 if auth.role()='authenticated' and not public.is_staff(auth.uid()) then
  if TG_OP='INSERT' then
   if new.is_restricted or new.suspended_until is not null or new.completed_help_count<>0 then raise exception 'Protected profile fields'; end if;
  elsif new.is_restricted is distinct from old.is_restricted or new.suspended_until is distinct from old.suspended_until or new.completed_help_count is distinct from old.completed_help_count or new.id is distinct from old.id then raise exception 'Protected profile fields'; end if;
 end if; return new;
end $$;
create trigger protect_profile_fields before insert or update on public.profiles for each row execute function public.protect_profile_fields();

-- Atomic donor selection and listing status. Existing record identifiers are preserved.
create or replace function public.manage_product(p_listing_id uuid,p_status text,p_interest_id uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare l public.product_listings; i public.product_interests; u uuid:=auth.uid();
begin
 if u is null then raise exception 'Sign in required'; end if;
 select * into l from public.product_listings where id=p_listing_id for update;
 if not found or (l.owner_id<>u and not public.is_staff(u)) then raise exception 'Donor access required'; end if;
 if p_interest_id is not null then
  select * into i from public.product_interests where id=p_interest_id and listing_id=l.id for update;
  if not found then raise exception 'Interest not found'; end if;
  if p_status='reserved' then
   if l.status<>'published' or i.status<>'pending' then raise exception 'This item or interest is no longer available'; end if;
   update public.product_interests set status='reserved' where id=i.id;
   update public.product_listings set status='reserved' where id=l.id;
  elsif p_status='completed' then
   if l.status<>'reserved' or i.status<>'reserved' then raise exception 'Reserve the item before confirming handover'; end if;
   update public.product_interests set status='completed' where id=i.id;
   update public.product_interests set status='declined' where listing_id=l.id and id<>i.id and status='pending';
   update public.product_listings set status='given_away' where id=l.id;
  elsif p_status='declined' and i.status='pending' then update public.product_interests set status='declined' where id=i.id;
  else raise exception 'Invalid interest transition'; end if;
 else
  if p_status='published' and l.status='reserved' then
   update public.product_interests set status='pending' where listing_id=l.id and status='reserved';
  elsif p_status in ('removed','expired') and l.status not in ('given_away','removed','expired') then
   update public.product_interests set status='declined' where listing_id=l.id and status in ('pending','reserved');
  elsif p_status='given_away' and l.status in ('published','reserved') then
   update public.product_interests set status=case when status='reserved' then 'completed'::public.interest_status else 'declined'::public.interest_status end where listing_id=l.id and status in ('pending','reserved');
  else raise exception 'Invalid listing transition'; end if;
  update public.product_listings set status=p_status::public.listing_status where id=l.id;
 end if;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata) values(u,'product:'||p_status,'product_listing',l.id,jsonb_build_object('interest_id',p_interest_id));
end $$;
revoke all on function public.manage_product(uuid,text,uuid) from public,anon;
grant execute on function public.manage_product(uuid,text,uuid) to authenticated;
-- State fields are changed only by trusted transition functions, not party UPDATE policies.
revoke update on public.product_interests from authenticated;

create or replace function public.guard_marketplace_write()
returns trigger language plpgsql set search_path=public as $$
declare actor uuid:=auth.uid(); owner uuid; parent_status text;
begin
 if auth.role()<>'authenticated' then return new; end if;
 if exists(select 1 from public.profiles where id=actor and (is_restricted or suspended_until>now())) then raise exception 'Your account is restricted'; end if;
 if TG_TABLE_NAME='help_requests' then
  if TG_OP='INSERT' and not public.is_staff(actor) and new.status not in ('draft','pending_review') then raise exception 'Requests require review'; end if;
  if TG_OP='UPDATE' and not public.is_staff(actor) then
   if new.owner_id<>old.owner_id then raise exception 'Ownership cannot change'; end if;
   if old.status in ('draft','pending_review','rejected') and new.status not in ('draft','pending_review','cancelled') then raise exception 'Requests require review'; end if;
  end if;
 elsif TG_TABLE_NAME='product_listings' then
  if TG_OP='INSERT' and not public.is_staff(actor) and new.status<>'pending_review' then raise exception 'Products require review'; end if;
  if TG_OP='UPDATE' and not public.is_staff(actor) then
   if new.owner_id<>old.owner_id then raise exception 'Ownership cannot change'; end if;
   if new.status is distinct from old.status and old.status='pending_review' and new.status<>'removed' then raise exception 'Products require review'; end if;
  end if;
 elsif TG_TABLE_NAME='request_applications' then
  select owner_id,status::text into owner,parent_status from public.help_requests where id=new.request_id;
  if TG_OP='INSERT' then
   if parent_status not in ('published','receiving_offers') or owner=actor or new.status<>'pending' or not new.no_payment_confirmed then raise exception 'This request is not accepting offers'; end if;
  elsif not public.is_staff(actor) then
   if new.helper_id<>old.helper_id or new.request_id<>old.request_id then raise exception 'Application identity cannot change'; end if;
   if actor<>owner and new.status is distinct from old.status and new.status<>'withdrawn' then raise exception 'Only the request owner can accept or decline'; end if;
   if old.status<>'pending' and new.status in ('accepted','declined') then raise exception 'Application already decided'; end if;
  end if;
 elsif TG_TABLE_NAME='product_interests' then
  select owner_id,status::text into owner,parent_status from public.product_listings where id=new.listing_id;
  if TG_OP='INSERT' and (parent_status<>'published' or owner=actor or new.status<>'pending' or new.user_id<>actor) then raise exception 'This item is not accepting requests'; end if;
 elsif TG_TABLE_NAME='service_offers' then
  if TG_OP='UPDATE' and new.user_id<>old.user_id then raise exception 'Ownership cannot change'; end if;
 end if;
 return new;
end $$;
create trigger guard_help_request before insert or update on public.help_requests for each row execute function public.guard_marketplace_write();
create trigger guard_product_listing before insert or update on public.product_listings for each row execute function public.guard_marketplace_write();
create trigger guard_help_application before insert or update on public.request_applications for each row execute function public.guard_marketplace_write();
create trigger guard_product_interest before insert or update on public.product_interests for each row execute function public.guard_marketplace_write();
create trigger guard_service_offer before insert or update on public.service_offers for each row execute function public.guard_marketplace_write();

-- Automatic server audit for admin changes; no browser-supplied actor or role is trusted.
create or replace function public.audit_admin_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.audit_logs(actor_id,action,entity_type,metadata) values(auth.uid(),TG_OP,TG_TABLE_NAME,jsonb_build_object('changed_at',now()));
 if TG_OP='DELETE' then return old; end if; return new;
end $$;
create trigger audit_role_changes after insert or update or delete on public.user_roles for each row execute function public.audit_admin_change();
create trigger audit_flag_changes after update on public.feature_flags for each row execute function public.audit_admin_change();
create trigger audit_quota_changes after update on public.ai_usage_limits for each row execute function public.audit_admin_change();
create trigger audit_category_changes after insert or update or delete on public.categories for each row execute function public.audit_admin_change();
-- Do not let a generic feature-flag switch enable an unconfigured ad or survey integration.
create or replace function public.guard_unconfigured_flags()
returns trigger language plpgsql set search_path=public as $$
begin
 if new.key in ('rewarded_ads','sponsor_surveys') and new.is_enabled then raise exception 'Provider, verification and policy review are required before enabling this feature'; end if;
 return new;
end $$;
create trigger guard_unconfigured_flags before insert or update on public.feature_flags for each row execute function public.guard_unconfigured_flags();
