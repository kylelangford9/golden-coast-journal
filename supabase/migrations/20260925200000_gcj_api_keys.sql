-- Keys for the Journal's public API (GET /api/v1/edition).
--
-- The edition is public; a key names the site reading it, so the newsroom can
-- see who carries the paper, switch one consumer off, and later grant a scope
-- to one partner. Only the SHA-256 of a key is stored. Keys are issued and
-- revoked with scripts/api-keys.mjs, which prints a new key once.
--
-- Same protection as every other gcj_ table: reachable only by the Journal's
-- server, through gcj_private.authorized().

create table if not exists public.gcj_api_keys (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  key_prefix text not null check (key_prefix ~ '^gcj_(live|test)_[A-Za-z0-9]{4}$'),
  key_hash text not null unique check (key_hash ~ '^[0-9a-f]{64}$'),
  scopes text[] not null default array['edition:read']::text[],
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

alter table public.gcj_api_keys enable row level security;
alter table public.gcj_api_keys force row level security;

revoke all on table public.gcj_api_keys from public, authenticated;
grant select, insert, update, delete on table public.gcj_api_keys to anon;
grant all on table public.gcj_api_keys to service_role;

drop policy if exists gcj_server_access on public.gcj_api_keys;
create policy gcj_server_access
  on public.gcj_api_keys
  for all
  to anon
  using ((select gcj_private.authorized()))
  with check ((select gcj_private.authorized()));

comment on table public.gcj_api_keys is
  'API keys for the public edition endpoint. key_hash is the SHA-256 of the key; the key itself is never stored. key_prefix identifies a key in lists without being usable.';
