-- Run once in Supabase SQL Editor.
-- This lets the D24 owner manage member roles from the Admin area.

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'owner') $$;

create policy "Owners manage member roles"
on public.profiles for update to authenticated
using (public.is_owner()) with check (public.is_owner());


drop policy if exists "Owners delete project proposals" on public.project_proposals;
create policy "Owners delete project proposals"
on public.project_proposals for delete to authenticated
using (public.is_owner());
