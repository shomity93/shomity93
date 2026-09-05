create extension if not exists pgcrypto;
create type cooperative_role as enum ('admin', 'moderator', 'member');
create type member_status as enum ('pending', 'approved', 'suspended');
create type deposit_category as enum ('monthly', 'project', 'fine');
create type expense_category as enum ('office', 'project_investment', 'others');

create table if not exists member_invites (id uuid primary key default gen_random_uuid(), email text unique not null, member_id text unique not null, full_name text not null, phone text not null, status member_status not null default 'pending', approved_by uuid references auth.users(id), approved_at timestamptz, created_at timestamptz not null default now());
create table if not exists cooperative_members (id uuid primary key default gen_random_uuid(), auth_user_id uuid unique references auth.users(id) on delete cascade, member_id text unique not null, full_name text not null, email text unique, phone text not null, address text, photo_url text, role cooperative_role not null default 'member', status member_status not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists member_sheets (id uuid primary key default gen_random_uuid(), member_id uuid unique references cooperative_members(id) on delete cascade not null, opening_balance numeric(12,2) not null default 0, created_at timestamptz not null default now());
create table if not exists site_settings (id uuid primary key default gen_random_uuid(), name text not null, tagline_one text not null, tagline_two text not null, contact_email text not null, updated_at timestamptz not null default now());
create table if not exists gallery (id uuid primary key default gen_random_uuid(), title text not null, image_url text not null, storage_path text not null, sort_order integer not null default 0, is_visible boolean not null default true, created_at timestamptz not null default now());
create table if not exists deposits (id uuid primary key default gen_random_uuid(), transaction_id text unique not null, occurred_on date not null, member_id uuid references cooperative_members(id) not null, category deposit_category not null, amount numeric(12,2) not null check (amount > 0), payment_method text not null, receipt_url text, receipt_name text, receipt_type text, receipt_size integer, entered_by uuid references auth.users(id), created_at timestamptz not null default now());
create table if not exists expenses (id uuid primary key default gen_random_uuid(), voucher_no text unique not null, occurred_on date not null, description text not null, category expense_category not null, total_amount numeric(12,2) not null check (total_amount > 0), voucher_url text, voucher_name text, voucher_type text, voucher_size integer, entered_by uuid references auth.users(id), created_at timestamptz not null default now());
alter table deposits add column if not exists receipt_name text;
alter table deposits add column if not exists receipt_type text;
alter table deposits add column if not exists receipt_size integer;
alter table expenses add column if not exists voucher_name text;
alter table expenses add column if not exists voucher_type text;
alter table expenses add column if not exists voucher_size integer;

create or replace function create_member_sheet() returns trigger language plpgsql security definer as $$ begin insert into member_sheets(member_id) values(new.id) on conflict (member_id) do nothing; return new; end; $$;
drop trigger if exists after_member_created on cooperative_members;
create trigger after_member_created after insert on cooperative_members for each row execute function create_member_sheet();

alter table member_invites enable row level security;
alter table cooperative_members enable row level security;
drop policy if exists "public can verify approved invite" on member_invites;
create policy "public can verify approved invite" on member_invites for select to anon, authenticated using (status = 'approved');
alter table member_sheets enable row level security;
alter table deposits enable row level security;
alter table expenses enable row level security;

create or replace function public.is_coop_admin() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.cooperative_members where auth_user_id = auth.uid() and role = 'admin' and status = 'approved') $$;
create or replace function public.is_coop_editor() returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.cooperative_members where auth_user_id = auth.uid() and role in ('admin', 'moderator') and status = 'approved') $$;

 drop policy if exists "approved authenticated users can view members" on cooperative_members;
 drop policy if exists "approved authenticated users can view sheets" on member_sheets;
 drop policy if exists "approved authenticated users can view deposits" on deposits;
 drop policy if exists "approved authenticated users can view expenses" on expenses;
create policy "approved authenticated users can view members" on cooperative_members for select to authenticated using (status = 'approved');
create policy "approved authenticated users can view sheets" on member_sheets for select to authenticated using (exists(select 1 from cooperative_members m where m.id = member_sheets.member_id and m.status = 'approved'));
create policy "approved authenticated users can view deposits" on deposits for select to authenticated using (true);
create policy "approved authenticated users can view expenses" on expenses for select to authenticated using (true);
create policy "admin manages invites" on member_invites for all to authenticated using (is_coop_admin()) with check (is_coop_admin());
create policy "admin manages members" on cooperative_members for all to authenticated using (is_coop_admin()) with check (is_coop_admin());
create policy "editors add deposits" on deposits for insert to authenticated with check (is_coop_editor());
create policy "editors update deposits" on deposits for update to authenticated using (is_coop_editor()) with check (is_coop_editor());
create policy "admins delete deposits" on deposits for delete to authenticated using (is_coop_admin());
create policy "editors add expenses" on expenses for insert to authenticated with check (is_coop_editor());
create policy "editors update expenses" on expenses for update to authenticated using (is_coop_editor()) with check (is_coop_editor());
create policy "admins delete expenses" on expenses for delete to authenticated using (is_coop_admin());

alter publication supabase_realtime add table deposits;
alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table cooperative_members;

-- Homepage presentation content migration for existing projects
alter table gallery add column if not exists is_visible boolean not null default true;
alter table site_settings add column if not exists notice_text text not null default 'সঞ্চয়, সহযোগিতা ও স্বচ্ছতার মাধ্যমে একটি নিরাপদ সম্মিলিত ভবিষ্যৎ গড়ার অঙ্গীকার।';
alter table site_settings enable row level security;
alter table gallery enable row level security;
drop policy if exists "public can view site settings" on site_settings;
drop policy if exists "public can view gallery" on gallery;
drop policy if exists "admin manages site settings" on site_settings;
drop policy if exists "admin manages gallery" on gallery;
create policy "public can view site settings" on site_settings for select to anon, authenticated using (true);
create policy "public can view gallery" on gallery for select to anon, authenticated using (true);
create policy "admin manages site settings" on site_settings for all to authenticated using (is_coop_admin()) with check (is_coop_admin());
create policy "admin manages gallery" on gallery for all to authenticated using (is_coop_admin()) with check (is_coop_admin());

-- Manual Admin-managed website logo and member profile photo migration
alter table site_settings add column if not exists logo_url text;
alter table site_settings add column if not exists logo_path text;
drop policy if exists "admin updates member photos" on cooperative_members;
create policy "admin updates member photos" on cooperative_members for update to authenticated using (is_coop_admin()) with check (is_coop_admin());

-- Per-member transaction ledger for deposits, withdrawals, fines, and loans
DO $$ BEGIN
  CREATE TYPE member_transaction_type AS ENUM ('deposit', 'withdrawal', 'fine', 'loan');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS member_transactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references cooperative_members(id) on delete cascade not null,
  transaction_date date not null default current_date,
  transaction_type member_transaction_type not null,
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

ALTER TABLE member_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "approved users view member transactions" ON member_transactions;
DROP POLICY IF EXISTS "editors add member transactions" ON member_transactions;
DROP POLICY IF EXISTS "editors update member transactions" ON member_transactions;
DROP POLICY IF EXISTS "admins delete member transactions" ON member_transactions;
CREATE POLICY "approved users view member transactions" ON member_transactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "editors add member transactions" ON member_transactions
  FOR INSERT TO authenticated WITH CHECK (is_coop_editor());
CREATE POLICY "editors update member transactions" ON member_transactions
  FOR UPDATE TO authenticated USING (is_coop_editor()) WITH CHECK (is_coop_editor());
CREATE POLICY "admins delete member transactions" ON member_transactions
  FOR DELETE TO authenticated USING (is_coop_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE member_transactions;

-- Storage bucket and policies used by compressed logo/member/receipt/voucher uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('cooperative-files', 'cooperative-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "public can view cooperative files" ON storage.objects;
DROP POLICY IF EXISTS "approved editors upload cooperative files" ON storage.objects;
DROP POLICY IF EXISTS "approved editors update cooperative files" ON storage.objects;
DROP POLICY IF EXISTS "approved admins delete cooperative files" ON storage.objects;
CREATE POLICY "public can view cooperative files" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'cooperative-files');
CREATE POLICY "approved editors upload cooperative files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cooperative-files' AND is_coop_editor());
CREATE POLICY "approved editors update cooperative files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'cooperative-files' AND is_coop_editor())
  WITH CHECK (bucket_id = 'cooperative-files' AND is_coop_editor());
CREATE POLICY "approved admins delete cooperative files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cooperative-files' AND is_coop_admin());

-- Expanded member onboarding and approval-request migration
alter table public.member_invites add column if not exists country text;
alter table public.member_invites add column if not exists country_code text;
alter table public.member_invites add column if not exists national_id text;
alter table public.member_invites add column if not exists passport_number text;
alter table public.cooperative_members add column if not exists country text;
alter table public.cooperative_members add column if not exists country_code text;
alter table public.cooperative_members add column if not exists national_id text;
alter table public.cooperative_members add column if not exists passport_number text;

drop policy if exists "public can request member invite" on public.member_invites;
create policy "public can request member invite" on public.member_invites
for insert to anon, authenticated
with check (status = 'pending');

drop policy if exists "public can view approved invite" on public.member_invites;
create policy "public can view approved invite" on public.member_invites
for select to anon, authenticated
using (status = 'approved');

-- Unlimited editable homepage presentation posts
create table if not exists public.presentation_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_text text not null default '',
  image_url text,
  storage_path text,
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.presentation_posts enable row level security;
drop policy if exists "public can view presentation posts" on public.presentation_posts;
drop policy if exists "admin manages presentation posts" on public.presentation_posts;
create policy "public can view presentation posts" on public.presentation_posts
for select to anon, authenticated using (is_visible = true);
create policy "admin manages presentation posts" on public.presentation_posts
for all to authenticated using (is_coop_admin()) with check (is_coop_admin());
alter publication supabase_realtime add table public.presentation_posts;
