create type cooperative_role as enum ('admin', 'moderator', 'member');
create type deposit_category as enum ('monthly', 'project', 'fine');
create type expense_category as enum ('office', 'project_investment', 'others');

create table if not exists site_settings (id uuid primary key default gen_random_uuid(), name text not null, tagline_one text not null, tagline_two text not null, contact_email text not null, updated_at timestamptz not null default now());
create table if not exists gallery (id uuid primary key default gen_random_uuid(), title text not null, image_url text not null, storage_path text not null, sort_order integer not null default 0, created_at timestamptz not null default now());
create table if not exists cooperative_members (id uuid primary key default gen_random_uuid(), member_id text unique not null, full_name text not null, email text, phone text, photo_url text, role cooperative_role not null default 'member', created_at timestamptz not null default now());
create table if not exists deposits (id uuid primary key default gen_random_uuid(), transaction_id text unique not null, occurred_on date not null, member_id uuid references cooperative_members(id) not null, category deposit_category not null, amount numeric(12,2) not null check (amount > 0), payment_method text not null, receipt_url text, entered_by uuid references auth.users(id), created_at timestamptz not null default now());
create table if not exists expenses (id uuid primary key default gen_random_uuid(), voucher_no text unique not null, occurred_on date not null, description text not null, category expense_category not null, total_amount numeric(12,2) not null check (total_amount > 0), voucher_url text, entered_by uuid references auth.users(id), created_at timestamptz not null default now());

alter table deposits enable row level security;
alter table expenses enable row level security;
create policy "authenticated members can read deposits" on deposits for select to authenticated using (true);
create policy "authenticated members can read expenses" on expenses for select to authenticated using (true);
-- Apply insert/update/delete policies using the member role claim in production.
alter publication supabase_realtime add table deposits;
alter publication supabase_realtime add table expenses;
