-- Run this entire file in Supabase: SQL Editor > New query > Run.
-- Before you run it, replace YOUR_EMAIL@example.com with the email you will use to sign in.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'D24 member',
  role text not null default 'member' check (role in ('owner', 'treasurer', 'member')),
  created_at timestamptz not null default now()
);

create table public.contributions (
  id bigint generated always as identity primary key,
  member_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.project_proposals (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) between 3 and 120),
  requested_amount numeric(12,2) not null check (requested_amount > 0),
  description text not null check (char_length(description) between 10 and 1500),
  status text not null default 'review' check (status in ('review', 'approved', 'declined')),
  proposed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.contributions enable row level security;
alter table public.project_proposals enable row level security;

create or replace function public.is_officer()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'treasurer')) $$;

create policy "Members can read profiles" on public.profiles for select to authenticated using (true);
create policy "Members can read contributions" on public.contributions for select to authenticated using (true);
create policy "Officers record contributions" on public.contributions for insert to authenticated with check (public.is_officer() and recorded_by = auth.uid());
create policy "Members can read proposals" on public.project_proposals for select to authenticated using (true);
create policy "Members submit proposals" on public.project_proposals for insert to authenticated with check (proposed_by = auth.uid());

-- After creating your first user in Authentication > Users, run this line once,
-- replacing YOUR_EMAIL@example.com with that user's email address.
-- update public.profiles set role = 'owner', display_name = 'Your name' where id = (select id from auth.users where email = 'YOUR_EMAIL@example.com');
