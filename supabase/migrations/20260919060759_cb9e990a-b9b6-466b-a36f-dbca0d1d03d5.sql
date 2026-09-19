-- ========== enums ==========
create type public.app_role as enum ('member','moderator','admin');
create type public.request_type as enum ('digital_service','skill_knowledge','product');
create type public.request_status as enum ('draft','pending_review','published','receiving_offers','in_progress','completed','cancelled','rejected','closed');
create type public.listing_status as enum ('pending_review','published','reserved','given_away','expired','removed');
create type public.application_status as enum ('pending','accepted','declined','withdrawn');
create type public.interest_status as enum ('pending','reserved','declined','completed');
create type public.report_reason as enum ('spam','scam_fraud','illegal_goods','harassment','hate_abuse','sexual_content','dangerous_activity','misleading_offer','privacy_violation','other');
create type public.report_status as enum ('open','under_review','resolved','dismissed');
create type public.experience_level as enum ('beginner','intermediate','experienced','professional');

-- ========== shared helpers ==========
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ========== profiles ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Kindora member',
  avatar_url text,
  bio text,
  skills text[] not null default '{}',
  interests text[] not null default '{}',
  languages text[] not null default '{}',
  city text,
  country text,
  portfolio_links text[] not null default '{}',
  is_available boolean not null default false,
  show_location boolean not null default true,
  is_public boolean not null default true,
  completed_help_count integer not null default 0,
  suspended_until timestamptz,
  is_restricted boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant select on public.profiles to anon;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- ========== user roles ==========
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('moderator','admin'))
$$;

create policy "roles readable by self" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- profiles policies (need is_staff)
create policy "public profiles readable" on public.profiles for select
  using (deleted_at is null and (is_public or id = auth.uid() or public.is_staff(auth.uid())));
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid())) with check (true);

-- ========== categories ==========
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  group_name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories readable" on public.categories for select using (true);
create policy "admins manage categories" on public.categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();

insert into public.categories (name, slug, group_name, sort_order) values
 ('Logo Design','logo-design','Digital Services',1),
 ('Poster and Banner Design','poster-banner-design','Digital Services',2),
 ('Resume and CV','resume-cv','Digital Services',3),
 ('Website Starter','website-starter','Digital Services',4),
 ('App Prototype','app-prototype','Digital Services',5),
 ('Graphic Design','graphic-design','Digital Services',6),
 ('Video Editing','video-editing','Digital Services',7),
 ('Translation','translation','Digital Services',8),
 ('Content Writing','content-writing','Digital Services',9),
 ('Technical Guidance','technical-guidance','Digital Services',10),
 ('Coding Help','coding-help','Skills and Knowledge',11),
 ('Education','education','Skills and Knowledge',12),
 ('Career Guidance','career-guidance','Skills and Knowledge',13),
 ('Business Mentorship','business-mentorship','Skills and Knowledge',14),
 ('Digital Literacy','digital-literacy','Skills and Knowledge',15),
 ('Marketing Guidance','marketing-guidance','Skills and Knowledge',16),
 ('General Knowledge Sharing','general-knowledge-sharing','Skills and Knowledge',17),
 ('Books','books','Free Products',18),
 ('Clothes','clothes','Free Products',19),
 ('Furniture','furniture','Free Products',20),
 ('Electronics','electronics','Free Products',21),
 ('Educational Materials','educational-materials','Free Products',22),
 ('Household Items','household-items','Free Products',23),
 ('Other Permitted Items','other-permitted-items','Free Products',24);

-- ========== help requests ==========
create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  request_type public.request_type not null,
  category_id uuid references public.categories(id) on delete set null,
  is_remote boolean not null default true,
  location text,
  language text,
  needed_by date,
  attachments text[] not null default '{}',
  required_features text,
  expected_deliverables text,
  complexity text,
  hosting_expectations text,
  is_prototype boolean,
  status public.request_status not null default 'pending_review',
  offers_count integer not null default 0,
  moderation_note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index help_requests_status_idx on public.help_requests (status, created_at desc);
create index help_requests_owner_idx on public.help_requests (owner_id);
create index help_requests_category_idx on public.help_requests (category_id);
grant select, insert, update, delete on public.help_requests to authenticated;
grant select on public.help_requests to anon;
grant all on public.help_requests to service_role;
alter table public.help_requests enable row level security;
create trigger help_requests_updated_at before update on public.help_requests for each row execute function public.set_updated_at();
create policy "published requests readable" on public.help_requests for select
  using (deleted_at is null and status in ('published','receiving_offers','in_progress','completed'));
create policy "owners read own requests" on public.help_requests for select to authenticated
  using (owner_id = auth.uid() or public.is_staff(auth.uid()));
create policy "owners create requests" on public.help_requests for insert to authenticated with check (owner_id = auth.uid());
create policy "owners update requests" on public.help_requests for update to authenticated
  using (owner_id = auth.uid() or public.is_staff(auth.uid())) with check (true);
create policy "owners delete requests" on public.help_requests for delete to authenticated
  using (owner_id = auth.uid() or public.is_staff(auth.uid()));

-- ========== service offers (helper profiles) ==========
create table public.service_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  headline text not null,
  intro text,
  skills text[] not null default '{}',
  category_ids uuid[] not null default '{}',
  experience public.experience_level not null default 'intermediate',
  availability text,
  is_remote boolean not null default true,
  location text,
  languages text[] not null default '{}',
  portfolio_links text[] not null default '{}',
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_offers_user_idx on public.service_offers (user_id);
grant select, insert, update, delete on public.service_offers to authenticated;
grant select on public.service_offers to anon;
grant all on public.service_offers to service_role;
alter table public.service_offers enable row level security;
create trigger service_offers_updated_at before update on public.service_offers for each row execute function public.set_updated_at();
create policy "active offers readable" on public.service_offers for select using (deleted_at is null and is_active);
create policy "own offers readable" on public.service_offers for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "own offers write" on public.service_offers for insert to authenticated with check (user_id = auth.uid());
create policy "own offers update" on public.service_offers for update to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid())) with check (true);
create policy "own offers delete" on public.service_offers for delete to authenticated using (user_id = auth.uid());

-- ========== request applications ==========
create table public.request_applications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests(id) on delete cascade,
  helper_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  relevant_skills text[] not null default '{}',
  proposed_deliverables text,
  estimated_days integer,
  questions text,
  no_payment_confirmed boolean not null default true,
  status public.application_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, helper_id)
);
create index request_applications_request_idx on public.request_applications (request_id);
grant select, insert, update, delete on public.request_applications to authenticated;
grant all on public.request_applications to service_role;
alter table public.request_applications enable row level security;
create trigger request_applications_updated_at before update on public.request_applications for each row execute function public.set_updated_at();
create policy "applications visible to parties" on public.request_applications for select to authenticated
  using (helper_id = auth.uid() or public.is_staff(auth.uid())
         or exists (select 1 from public.help_requests r where r.id = request_id and r.owner_id = auth.uid()));
create policy "helpers apply" on public.request_applications for insert to authenticated with check (helper_id = auth.uid());
create policy "parties update applications" on public.request_applications for update to authenticated
  using (helper_id = auth.uid() or public.is_staff(auth.uid())
         or exists (select 1 from public.help_requests r where r.id = request_id and r.owner_id = auth.uid()))
  with check (true);
create policy "helpers withdraw" on public.request_applications for delete to authenticated using (helper_id = auth.uid());

-- ========== product listings ==========
create table public.product_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null,
  category_id uuid references public.categories(id) on delete set null,
  condition text not null default 'good',
  photos text[] not null default '{}',
  location text,
  pickup_available boolean not null default true,
  delivery_available boolean not null default false,
  quantity integer not null default 1,
  size_note text,
  giveaway_rules text,
  status public.listing_status not null default 'pending_review',
  moderation_note text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_listings_status_idx on public.product_listings (status, created_at desc);
create index product_listings_owner_idx on public.product_listings (owner_id);
grant select, insert, update, delete on public.product_listings to authenticated;
grant select on public.product_listings to anon;
grant all on public.product_listings to service_role;
alter table public.product_listings enable row level security;
create trigger product_listings_updated_at before update on public.product_listings for each row execute function public.set_updated_at();
create policy "published listings readable" on public.product_listings for select
  using (deleted_at is null and status in ('published','reserved','given_away'));
create policy "own listings readable" on public.product_listings for select to authenticated
  using (owner_id = auth.uid() or public.is_staff(auth.uid()));
create policy "own listings insert" on public.product_listings for insert to authenticated with check (owner_id = auth.uid());
create policy "own listings update" on public.product_listings for update to authenticated
  using (owner_id = auth.uid() or public.is_staff(auth.uid())) with check (true);
create policy "own listings delete" on public.product_listings for delete to authenticated
  using (owner_id = auth.uid() or public.is_staff(auth.uid()));

-- ========== product interests ==========
create table public.product_interests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.product_listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status public.interest_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, user_id)
);
grant select, insert, update, delete on public.product_interests to authenticated;
grant all on public.product_interests to service_role;
alter table public.product_interests enable row level security;
create trigger product_interests_updated_at before update on public.product_interests for each row execute function public.set_updated_at();
create policy "interests visible to parties" on public.product_interests for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid())
         or exists (select 1 from public.product_listings l where l.id = listing_id and l.owner_id = auth.uid()));
create policy "express interest" on public.product_interests for insert to authenticated with check (user_id = auth.uid());
create policy "parties update interests" on public.product_interests for update to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid())
         or exists (select 1 from public.product_listings l where l.id = listing_id and l.owner_id = auth.uid()))
  with check (true);
create policy "withdraw interest" on public.product_interests for delete to authenticated using (user_id = auth.uid());

-- ========== conversations ==========
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.help_requests(id) on delete set null,
  listing_id uuid references public.product_listings(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  attachment_url text,
  read_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.conversation_participants to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.conversations, public.conversation_participants, public.messages to service_role;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_conversation_participant(_conversation_id uuid, _user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_participants p
                 where p.conversation_id = _conversation_id and p.user_id = _user_id)
$$;

create policy "participants read conversations" on public.conversations for select to authenticated
  using (public.is_conversation_participant(id, auth.uid()) or public.is_staff(auth.uid()));
create policy "create conversations" on public.conversations for insert to authenticated with check (created_by = auth.uid());
create policy "participants update conversations" on public.conversations for update to authenticated
  using (public.is_conversation_participant(id, auth.uid())) with check (true);

create policy "participants read participants" on public.conversation_participants for select to authenticated
  using (user_id = auth.uid() or public.is_conversation_participant(conversation_id, auth.uid()) or public.is_staff(auth.uid()));
create policy "add participants" on public.conversation_participants for insert to authenticated
  with check (
    exists (select 1 from public.conversations c where c.id = conversation_id and c.created_by = auth.uid())
    or user_id = auth.uid());
create policy "update own participation" on public.conversation_participants for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "participants read messages" on public.messages for select to authenticated
  using (public.is_conversation_participant(conversation_id, auth.uid()) or public.is_staff(auth.uid()));
create policy "participants send messages" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_conversation_participant(conversation_id, auth.uid()));
create policy "participants update messages" on public.messages for update to authenticated
  using (public.is_conversation_participant(conversation_id, auth.uid())) with check (true);

-- ========== reviews ==========
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.help_requests(id) on delete cascade,
  listing_id uuid references public.product_listings(id) on delete cascade,
  reviewer_id uuid not null references auth.users(id) on delete cascade,
  reviewee_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  check (reviewer_id <> reviewee_id)
);
create unique index reviews_unique_per_request on public.reviews (request_id, reviewer_id) where request_id is not null;
grant select, insert, update, delete on public.reviews to authenticated;
grant select on public.reviews to anon;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews readable" on public.reviews for select using (not is_hidden);
create policy "staff read all reviews" on public.reviews for select to authenticated using (public.is_staff(auth.uid()));
create policy "write own review" on public.reviews for insert to authenticated with check (reviewer_id = auth.uid());
create policy "update own review" on public.reviews for update to authenticated
  using (reviewer_id = auth.uid() or public.is_staff(auth.uid())) with check (true);

-- ========== reports / moderation ==========
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'open',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);
grant select, insert on public.reports to authenticated;
grant update on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "reporters and staff read reports" on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_staff(auth.uid()));
create policy "anyone signed in reports" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy "staff update reports" on public.reports for update to authenticated
  using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references auth.users(id) on delete cascade,
  report_id uuid references public.reports(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  action text not null,
  reason public.report_reason,
  note text,
  created_at timestamptz not null default now()
);
grant select, insert on public.moderation_actions to authenticated;
grant all on public.moderation_actions to service_role;
alter table public.moderation_actions enable row level security;
create policy "staff read moderation" on public.moderation_actions for select to authenticated using (public.is_staff(auth.uid()));
create policy "staff write moderation" on public.moderation_actions for insert to authenticated
  with check (public.is_staff(auth.uid()) and moderator_id = auth.uid());

create table public.blocked_users (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
grant select, insert, delete on public.blocked_users to authenticated;
grant all on public.blocked_users to service_role;
alter table public.blocked_users enable row level security;
create policy "own blocks" on public.blocked_users for select to authenticated using (blocker_id = auth.uid() or public.is_staff(auth.uid()));
create policy "create own blocks" on public.blocked_users for insert to authenticated with check (blocker_id = auth.uid());
create policy "delete own blocks" on public.blocked_users for delete to authenticated using (blocker_id = auth.uid());

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "admins read audit" on public.audit_logs for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- ========== notifications ==========
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "own notifications update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notifications delete" on public.notifications for delete to authenticated using (user_id = auth.uid());
create policy "insert notifications" on public.notifications for insert to authenticated with check (true);

-- ========== AI ==========
create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  output_url text,
  model text,
  status text not null default 'completed',
  error_message text,
  created_at timestamptz not null default now()
);
create index ai_generations_user_idx on public.ai_generations (user_id, created_at desc);
grant select, insert, delete on public.ai_generations to authenticated;
grant all on public.ai_generations to service_role;
alter table public.ai_generations enable row level security;
create policy "own ai history" on public.ai_generations for select to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()));
create policy "own ai insert" on public.ai_generations for insert to authenticated with check (user_id = auth.uid());
create policy "own ai delete" on public.ai_generations for delete to authenticated using (user_id = auth.uid());

create table public.ai_usage_limits (
  tool text primary key,
  daily_limit integer not null default 3,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
grant select on public.ai_usage_limits to anon, authenticated;
grant all on public.ai_usage_limits to service_role;
alter table public.ai_usage_limits enable row level security;
create policy "limits readable" on public.ai_usage_limits for select using (true);
create policy "admins manage limits" on public.ai_usage_limits for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.ai_usage_limits (tool, daily_limit) values
 ('logo_maker',3),('resume_builder',5),('website_starter',2);

-- ========== feature flags ==========
create table public.feature_flags (
  key text primary key,
  description text,
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
grant select on public.feature_flags to anon, authenticated;
grant all on public.feature_flags to service_role;
alter table public.feature_flags enable row level security;
create policy "flags readable" on public.feature_flags for select using (true);
create policy "admins manage flags" on public.feature_flags for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.feature_flags (key, description, is_enabled) values
 ('donations','Voluntary Support Kindora donations',false),
 ('ai_logo_maker','Free AI logo maker',true),
 ('ai_resume_builder','Free AI resume builder',true),
 ('ai_website_starter','Free AI website starter',true),
 ('messaging_attachments','Attachments in messages',false),
 ('product_marketplace','Free products marketplace',true),
 ('new_categories','Allow new category suggestions',false);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  amount_minor integer not null,
  currency text not null default 'INR',
  provider text,
  provider_reference text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select on public.donations to authenticated;
grant all on public.donations to service_role;
alter table public.donations enable row level security;
create policy "own donations" on public.donations for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));