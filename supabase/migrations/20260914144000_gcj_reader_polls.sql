create table if not exists public.gcj_poll_votes (
  id text primary key,
  poll_id text not null,
  option_id text not null,
  voter_hash text not null,
  created_at timestamptz not null default now(),
  constraint gcj_poll_votes_one_vote_per_poll unique (poll_id, voter_hash),
  constraint gcj_poll_votes_poll_id_length check (char_length(poll_id) between 1 and 80),
  constraint gcj_poll_votes_option_id_length check (char_length(option_id) between 1 and 80),
  constraint gcj_poll_votes_voter_hash_length check (char_length(voter_hash) = 64)
);

create index if not exists gcj_poll_votes_result_idx
  on public.gcj_poll_votes (poll_id, option_id);

alter table public.gcj_poll_votes enable row level security;
alter table public.gcj_poll_votes force row level security;

revoke all on table public.gcj_poll_votes from public, anon, authenticated;
grant select, insert on table public.gcj_poll_votes to anon;
grant all on table public.gcj_poll_votes to service_role;

drop policy if exists gcj_poll_server_select on public.gcj_poll_votes;
create policy gcj_poll_server_select
  on public.gcj_poll_votes
  for select
  to anon
  using ((select gcj_private.authorized()));

drop policy if exists gcj_poll_server_insert on public.gcj_poll_votes;
create policy gcj_poll_server_insert
  on public.gcj_poll_votes
  for insert
  to anon
  with check ((select gcj_private.authorized()));

create or replace function public.gcj_poll_results()
returns table (poll_id text, option_id text, votes bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select poll_votes.poll_id, poll_votes.option_id, count(*)::bigint as votes
  from public.gcj_poll_votes as poll_votes
  group by poll_votes.poll_id, poll_votes.option_id
  order by poll_votes.poll_id, votes desc, poll_votes.option_id;
$$;

revoke all on function public.gcj_poll_results() from public, authenticated;
grant execute on function public.gcj_poll_results() to anon, service_role;

comment on table public.gcj_poll_votes is
  'One privacy-limited browser response per Golden Coast Journal reader poll.';
comment on column public.gcj_poll_votes.voter_hash is
  'SHA-256 of a poll-scoped browser token and the server secret; no email or raw network address is stored.';
