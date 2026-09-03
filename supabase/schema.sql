create extension if not exists pgcrypto;
create type cooperative_role as enum ('admin', 'moderator', 'member');
create type member_status as enum ('pending', 'approved', 'suspended');
create type deposit_category as enum ('monthly', 'project', 'fine');
create type expense_category as enum ('office', 'project_investment', 'others');

create table if not exists member_invites (id uuid primary key default gen_random_uuid(), email text unique not null, member_id text unique not null, full_name text not null, phone text not null, status member_status not null default 'pending', approved_by uuid references auth.users(id), approved_at timestamptz, created_at timestamptz not null default now());
create table if not exists cooperative_members (id uuid primary key default gen_random_uuid(), auth_user_id uuid unique references auth.users(id) on delete cascade, member_id text unique not null, full_name text not null, email text unique, phone text not null, address text, photo_url text, role cooperative_role not null default 'member', status member_status not null default 'pending', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists member_sheets (id uuid primary key default gen_random_uuid(), member_id uuid unique references cooperative_members(id) on delete cascade not null, opening_balance numeric(12,2) not null default 0, created_at timestamptz not null default now());
create table if not exists site_settings (id uuid primary key default gen_random_uuid(), name text not null, tagline_one text not null, tagline_two text not null, contact_email text not null, updated_at timestamptz not null default now());
create table if not exists gallery (id uuid primary key default gen_random_uuid(), title text not null, image_url text not null, storage_path text not null, sort_order integer not null default 0, created_at timestamptz not null default now());
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
alter table member_sheets enable row level security;
alter table deposits enable row level security;
alter table expenses enable row level security;

create or replace function is_coop_admin() returns boolean language sql stable as $$ select coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin' $$;
create or replace function is_coop_editor() returns boolean language sql stable as $$ select coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'moderator') $$;

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
