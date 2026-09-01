-- Run once in Supabase: SQL Editor > New query > Run.
-- Adds one private yes/no vote per member for each project proposal.

create table public.proposal_votes (
  proposal_id bigint not null references public.project_proposals(id) on delete cascade,
  voter_id uuid not null references public.profiles(id) on delete cascade,
  vote boolean not null,
  created_at timestamptz not null default now(),
  primary key (proposal_id, voter_id)
);

alter table public.proposal_votes enable row level security;

create policy "Members can read proposal votes"
on public.proposal_votes for select to authenticated using (true);

create policy "Members cast their own votes"
on public.proposal_votes for insert to authenticated with check (voter_id = auth.uid());

create policy "Members change their own votes"
on public.proposal_votes for update to authenticated using (voter_id = auth.uid()) with check (voter_id = auth.uid());

create policy "Officers update proposal status"
on public.project_proposals for update to authenticated
using (public.is_officer()) with check (public.is_officer());


drop policy if exists "Owners delete project proposals" on public.project_proposals;
create policy "Owners delete project proposals"
on public.project_proposals for delete to authenticated
using (public.is_owner());
