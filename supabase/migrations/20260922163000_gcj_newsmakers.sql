-- A portrait register the Journal owns.
--
-- Mention portraits were read from one table, `representatives`, which belongs
-- to the California Votes application this project shares a database with. That
-- table means elected representatives, and it holds 186 of them: the governor
-- and constitutional officers, both chambers, the congressional delegation, the
-- Board of Equalization. California news is not made only by people who hold an
-- elected seat, so a story about a Cal OES deployment, a CPUC rate decision, a
-- Supreme Court opinion or a PG&E settlement showed no face at all.
--
-- The answer is not to widen `representatives`. Putting a mayor, an agency
-- director, a justice or a utility chief executive in a table called
-- "representatives" would corrupt another application's meaning of its own
-- data. This table is the Journal's, namespaced `gcj_`, and lib/people.ts reads
-- the two side by side.
--
-- Every row carries where its portrait came from and under what licence,
-- because the Journal publishes no picture it cannot account for. The
-- constraints below make that a property of the database rather than of the
-- script that happens to be loading it.

create table if not exists public.gcj_newsmakers (
  id text primary key,
  name text not null check (length(btrim(name)) > 0),
  office text not null check (length(btrim(office)) > 0),
  organization text,
  party text,
  -- The same vocabulary `representatives` uses, widened for the people this
  -- table exists to hold. lib/people.ts reads `level` straight through to the
  -- rail, so it has to read like something a caption would say.
  level text not null check (level in ('Federal', 'State', 'Local', 'Judicial', 'Private')),
  district text,
  city text,
  county text,
  urls text[] not null default '{}',

  photo_url text,
  -- Provenance, in the same shape as gcj_editorial_assets: who to credit, what
  -- licence permits the use, and the page where that licence was read.
  credit text,
  license text,
  license_url text,
  provenance_url text,
  -- The file as it was found, kept so the licence can be re-checked later
  -- against the original rather than against our copy of it.
  source_url text,
  -- The Journal publishes no AI imagery. Same hard guarantee as
  -- gcj_editorial_assets.ai_generated, for the same reason.
  ai_generated boolean not null default false check (ai_generated = false),

  -- Why this person belongs in a portrait register at all. A register grows by
  -- accretion unless each row has to justify itself.
  news_rationale text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint gcj_newsmakers_one_person_per_office unique (name, office),

  -- A portrait with no credit or no licence is not publishable, so it is not
  -- storable either. A row with no portrait is fine: it is a person the
  -- newsroom expects to name whose face we have not yet sourced.
  constraint gcj_newsmakers_portrait_is_accounted_for check (
    photo_url is null or (
      length(btrim(coalesce(credit, ''))) > 0
      and length(btrim(coalesce(license, ''))) > 0
      and length(btrim(coalesce(provenance_url, ''))) > 0
    )
  ),

  -- No hotlinking. A portrait is either a file in this site's own public
  -- storage or a path served by the site itself; it is never somebody else's
  -- host, which can move the file, rewrite it or bill us for the traffic.
  constraint gcj_newsmakers_portrait_is_self_hosted check (
    photo_url is null
    or photo_url ~ '^/[^/]'
    or photo_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/'
  )
);

create index if not exists gcj_newsmakers_lookup_idx
  on public.gcj_newsmakers (name) where is_active and photo_url is not null;

alter table public.gcj_newsmakers enable row level security;
alter table public.gcj_newsmakers force row level security;

revoke all on table public.gcj_newsmakers from public, authenticated;
grant select, insert, update, delete on table public.gcj_newsmakers to anon;
grant all on table public.gcj_newsmakers to service_role;

drop policy if exists gcj_server_access on public.gcj_newsmakers;
create policy gcj_server_access
  on public.gcj_newsmakers
  for all
  to anon
  using ((select gcj_private.authorized()))
  with check ((select gcj_private.authorized()));

comment on table public.gcj_newsmakers is
  'Californians the Journal names who hold no elected seat. Separate from the California Votes representatives table, which that application owns. No AI-generated portraits; enforced by the ai_generated check constraint.';
comment on column public.gcj_newsmakers.level is
  'Federal, State, Local, Judicial or Private. Read straight through to the "In this story" rail.';
comment on column public.gcj_newsmakers.district is
  'District, city and county are read by lib/people.ts only to tell two people of the same name apart.';
comment on column public.gcj_newsmakers.photo_url is
  'Self-hosted only. A third-party host is rejected by the gcj_newsmakers_portrait_is_self_hosted constraint.';
comment on column public.gcj_newsmakers.provenance_url is
  'The page where the licence was read, not where the file was found. Both are kept.';
comment on column public.gcj_newsmakers.news_rationale is
  'Why this person recurs in California coverage. A register without one grows by accretion.';
