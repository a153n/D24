-- D24 COMPLETE SUPABASE SETUP
create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default 'D24 member', role text not null default 'member' check (role in ('owner','treasurer','member')), created_at timestamptz not null default now());
create table if not exists public.contributions (id bigint generated always as identity primary key, member_id uuid not null references public.profiles(id) on delete restrict, amount numeric(12,2) not null check (amount > 0), paid_on date not null, recorded_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now());
create table if not exists public.project_proposals (id bigint generated always as identity primary key, title text not null check (char_length(title) between 3 and 120), requested_amount numeric(12,2) not null check (requested_amount > 0), description text not null check (char_length(description) between 10 and 1500), status text not null default 'review' check (status in ('review','approved','declined')), proposed_by uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now());
create table if not exists public.proposal_votes (proposal_id bigint not null references public.project_proposals(id) on delete cascade, voter_id uuid not null references public.profiles(id) on delete cascade, vote boolean not null, created_at timestamptz not null default now(), primary key (proposal_id, voter_id));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id,display_name) values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'),''),nullif(trim(new.raw_user_meta_data->>'username'),''),split_part(coalesce(new.email,'member'),'@',1))) on conflict(id) do nothing; return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_officer() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role in ('owner','treasurer')); $$;
create or replace function public.is_owner() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.profiles where id=auth.uid() and role='owner'); $$;

alter table public.profiles enable row level security;
alter table public.contributions enable row level security;
alter table public.project_proposals enable row level security;
alter table public.proposal_votes enable row level security;

do $$ declare p record; begin for p in select schemaname,tablename,policyname from pg_policies where schemaname='public' and tablename in ('profiles','contributions','project_proposals','proposal_votes') loop execute format('drop policy if exists %I on %I.%I',p.policyname,p.schemaname,p.tablename); end loop; end $$;

create policy "Members can read profiles" on public.profiles for select to authenticated using(true);
create policy "Owners manage member roles" on public.profiles for update to authenticated using(public.is_owner()) with check(public.is_owner());
create policy "Members can read contributions" on public.contributions for select to authenticated using(true);
create policy "Officers record contributions" on public.contributions for insert to authenticated with check(public.is_officer() and recorded_by=auth.uid());
create policy "Members can read proposals" on public.project_proposals for select to authenticated using(true);
create policy "Members submit proposals" on public.project_proposals for insert to authenticated with check(proposed_by=auth.uid());
create policy "Officers update proposal status" on public.project_proposals for update to authenticated using(public.is_officer()) with check(public.is_officer());
create policy "Owners delete project proposals" on public.project_proposals for delete to authenticated using(public.is_owner());
create policy "Members can read proposal votes" on public.proposal_votes for select to authenticated using(true);
create policy "Members cast their own votes" on public.proposal_votes for insert to authenticated with check(voter_id=auth.uid());
create policy "Members change their own votes" on public.proposal_votes for update to authenticated using(voter_id=auth.uid()) with check(voter_id=auth.uid());

-- After the first user exists, make that account the owner:
-- update public.profiles set role='owner',display_name='Your Name' where id=(select id from auth.users where email='YOUR_EMAIL@example.com');
