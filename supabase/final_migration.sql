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
