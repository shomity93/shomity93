-- Non-destructive cooperative production migration

alter table public.gallery
  add column if not exists is_visible boolean not null default true;

alter table public.site_settings
  add column if not exists notice_text text not null default 'সঞ্চয়, সহযোগিতা ও স্বচ্ছতার মাধ্যমে একটি নিরাপদ সম্মিলিত ভবিষ্যৎ গড়ার অঙ্গীকার.';

alter table public.site_settings
  add column if not exists logo_url text;

alter table public.site_settings
  add column if not exists logo_path text;

DO $$ BEGIN
  CREATE TYPE public.member_transaction_type AS ENUM ('deposit', 'withdrawal', 'fine', 'loan');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

create table if not exists public.member_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.cooperative_members(id) on delete cascade not null,
  transaction_date date not null default current_date,
  transaction_type public.member_transaction_type not null,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null default 'cash',
  attachment_url text,
  attachment_name text,
  attachment_type text,
  attachment_size integer,
  entered_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.member_transactions enable row level security;

create or replace function public.is_coop_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cooperative_members
    where auth_user_id = auth.uid()
      and role = 'admin'
      and status = 'approved'
  );
$$;

create or replace function public.is_coop_editor()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cooperative_members
    where auth_user_id = auth.uid()
      and role in ('admin', 'moderator')
      and status = 'approved'
  );
$$;

drop policy if exists "public can verify approved invite" on public.member_invites;
create policy "public can verify approved invite"
  on public.member_invites for select to anon, authenticated
  using (status = 'approved');

drop policy if exists "approved authenticated users can view members" on public.cooperative_members;
create policy "approved authenticated users can view members"
  on public.cooperative_members for select to authenticated
  using (status = 'approved');

drop policy if exists "admin manages members" on public.cooperative_members;
create policy "admin manages members"
  on public.cooperative_members for all to authenticated
  using (public.is_coop_admin()) with check (public.is_coop_admin());

drop policy if exists "approved authenticated users can view sheets" on public.member_sheets;
create policy "approved authenticated users can view sheets"
  on public.member_sheets for select to authenticated
  using (exists (select 1 from public.cooperative_members m where m.id = member_sheets.member_id and m.status = 'approved'));

drop policy if exists "approved users view member transactions" on public.member_transactions;
create policy "approved users view member transactions"
  on public.member_transactions for select to authenticated
  using (true);

drop policy if exists "editors add member transactions" on public.member_transactions;
create policy "editors add member transactions"
  on public.member_transactions for insert to authenticated
  with check (public.is_coop_editor());

drop policy if exists "editors update member transactions" on public.member_transactions;
create policy "editors update member transactions"
  on public.member_transactions for update to authenticated
  using (public.is_coop_editor()) with check (public.is_coop_editor());

drop policy if exists "admins delete member transactions" on public.member_transactions;
create policy "admins delete member transactions"
  on public.member_transactions for delete to authenticated
  using (public.is_coop_admin());

insert into storage.buckets (id, name, public)
values ('cooperative-files', 'cooperative-files', true)
on conflict (id) do update set public = true;

drop policy if exists "public can view cooperative files" on storage.objects;
create policy "public can view cooperative files"
  on storage.objects for select to public
  using (bucket_id = 'cooperative-files');

drop policy if exists "approved editors upload cooperative files" on storage.objects;
create policy "approved editors upload cooperative files"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'cooperative-files' and public.is_coop_editor());

drop policy if exists "approved editors update cooperative files" on storage.objects;
create policy "approved editors update cooperative files"
  on storage.objects for update to authenticated
  using (bucket_id = 'cooperative-files' and public.is_coop_editor())
  with check (bucket_id = 'cooperative-files' and public.is_coop_editor());

drop policy if exists "approved admins delete cooperative files" on storage.objects;
create policy "approved admins delete cooperative files"
  on storage.objects for delete to authenticated
  using (bucket_id = 'cooperative-files' and public.is_coop_admin());

DO $$ BEGIN
  IF NOT EXISTS (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'member_transactions') THEN
    alter publication supabase_realtime add table public.member_transactions;
  END IF;
END $$;

-- CMS table policies required for public reads and approved Admin writes
alter table public.site_settings enable row level security;
alter table public.gallery enable row level security;

drop policy if exists "public can view site settings" on public.site_settings;
create policy "public can view site settings"
  on public.site_settings for select to anon, authenticated
  using (true);

drop policy if exists "public can view gallery" on public.gallery;
create policy "public can view gallery"
  on public.gallery for select to anon, authenticated
  using (true);

drop policy if exists "admin manages site settings" on public.site_settings;
create policy "admin manages site settings"
  on public.site_settings for all to authenticated
  using (public.is_coop_admin()) with check (public.is_coop_admin());

drop policy if exists "admin manages gallery" on public.gallery;
create policy "admin manages gallery"
  on public.gallery for all to authenticated
  using (public.is_coop_admin()) with check (public.is_coop_admin());

-- Public homepage member directory: only approved member ID, name, and photo are exposed.
create or replace view public.member_directory as
select id, member_id, full_name, photo_url
from public.cooperative_members
where status = 'approved';
grant select on public.member_directory to anon, authenticated;

-- Secure onboarding RPCs: avoid broad public writes while allowing approval requests and approved profile/sheet sync.
create or replace function public.request_member_approval(
  p_email text, p_member_id text, p_full_name text, p_phone text,
  p_country text default null, p_country_code text default null,
  p_national_id text default null, p_passport_number text default null
) returns public.member_invites language plpgsql security definer set search_path = public as $$
declare existing public.member_invites;
begin
  if nullif(trim(p_email), '') is null or nullif(trim(p_member_id), '') is null or nullif(trim(p_full_name), '') is null or nullif(trim(p_phone), '') is null then raise exception 'ইমেইল, সদস্য আইডি, নাম ও মোবাইল নম্বর প্রয়োজন'; end if;
  select * into existing from public.member_invites where lower(email) = lower(trim(p_email)) limit 1;
  if existing.id is not null then
    if existing.status in ('approved', 'suspended') then return existing; end if;
    update public.member_invites set member_id = trim(p_member_id), full_name = trim(p_full_name), phone = trim(p_phone), country = nullif(trim(coalesce(p_country, '')), ''), country_code = nullif(trim(coalesce(p_country_code, '')), ''), national_id = nullif(trim(coalesce(p_national_id, '')), ''), passport_number = nullif(trim(coalesce(p_passport_number, '')), ''), status = 'pending' where id = existing.id returning * into existing;
    return existing;
  end if;
  insert into public.member_invites (email, member_id, full_name, phone, country, country_code, national_id, passport_number, status) values (lower(trim(p_email)), trim(p_member_id), trim(p_full_name), trim(p_phone), nullif(trim(coalesce(p_country, '')), ''), nullif(trim(coalesce(p_country_code, '')), ''), nullif(trim(coalesce(p_national_id, '')), ''), nullif(trim(coalesce(p_passport_number, '')), ''), 'pending') returning * into existing;
  return existing;
end; $$;
grant execute on function public.request_member_approval(text, text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.sync_approved_member_profile(
  p_email text, p_full_name text, p_phone text, p_member_id text,
  p_country text default null, p_country_code text default null,
  p_national_id text default null, p_passport_number text default null,
  p_photo_url text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); approved_invite public.member_invites; existing public.cooperative_members; profile_id uuid;
begin
  if current_user_id is null then raise exception 'সেশন পাওয়া যায়নি; আবার লগইন করুন'; end if;
  if lower(coalesce(auth.jwt() ->> 'email', '')) <> lower(trim(p_email)) then raise exception 'লগইন ইমেইল ও সদস্য ইমেইল মিলছে না'; end if;
  select * into approved_invite from public.member_invites where lower(email) = lower(trim(p_email)) and lower(member_id) = lower(trim(p_member_id)) and status = 'approved' limit 1;
  if approved_invite.id is null then raise exception 'এই email ও সদস্য ID-এর Admin অনুমোদন পাওয়া যায়নি'; end if;
  select * into existing from public.cooperative_members where lower(email) = lower(trim(p_email)) limit 1;
  if existing.id is not null then
    update public.cooperative_members set auth_user_id = current_user_id, member_id = trim(p_member_id), full_name = trim(p_full_name), phone = trim(p_phone), country = nullif(trim(coalesce(p_country, '')), ''), country_code = nullif(trim(coalesce(p_country_code, '')), ''), national_id = nullif(trim(coalesce(p_national_id, '')), ''), passport_number = nullif(trim(coalesce(p_passport_number, '')), ''), photo_url = coalesce(nullif(trim(coalesce(p_photo_url, '')), ''), existing.photo_url), status = 'approved' where id = existing.id returning id into profile_id;
  else
    insert into public.cooperative_members (auth_user_id, member_id, full_name, email, phone, country, country_code, national_id, passport_number, photo_url, role, status) values (current_user_id, trim(p_member_id), trim(p_full_name), lower(trim(p_email)), trim(p_phone), nullif(trim(coalesce(p_country, '')), ''), nullif(trim(coalesce(p_country_code, '')), ''), nullif(trim(coalesce(p_national_id, '')), ''), nullif(trim(coalesce(p_passport_number, '')), ''), nullif(trim(coalesce(p_photo_url, '')), ''), 'member', 'approved') returning id into profile_id;
  end if;
  insert into public.member_sheets (member_id) values (profile_id) on conflict (member_id) do nothing;
  return profile_id;
end; $$;
grant execute on function public.sync_approved_member_profile(text, text, text, text, text, text, text, text, text) to authenticated;

-- Secure post-auth profile photo synchronization for confirmed member signups.
create or replace function public.sync_member_photo(p_photo_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'সেশন পাওয়া যায়নি; আবার লগইন করুন';
  end if;
  update public.cooperative_members
  set photo_url = nullif(trim(coalesce(p_photo_url, '')), ''), updated_at = now()
  where auth_user_id = auth.uid() and status = 'approved';
  if not found then
    raise exception 'অনুমোদিত সদস্য প্রোফাইল পাওয়া যায়নি';
  end if;
end;
$$;
grant execute on function public.sync_member_photo(text) to authenticated;
