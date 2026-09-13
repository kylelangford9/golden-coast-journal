-- The Golden Coast Journal runs inside the existing California Votes project,
-- but every object is namespaced and protected independently.

create schema if not exists gcj_private;

create table if not exists gcj_private.app_keys (
  key_name text primary key,
  secret_hash text not null,
  updated_at timestamptz not null default now()
);

insert into gcj_private.app_keys (key_name, secret_hash)
values ('server', '32c7c1aa91d21702745f0e653af1da46dd5cb73a41075c0ac1c72407629ac782')
on conflict (key_name) do update
set secret_hash = excluded.secret_hash,
    updated_at = now();

create or replace function gcj_private.authorized()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select app_keys.secret_hash = encode(
        extensions.digest(
          coalesce(current_setting('request.headers', true)::jsonb ->> 'x-gcj-secret', ''),
          'sha256'
        ),
        'hex'
      )
      from gcj_private.app_keys
      where app_keys.key_name = 'server'
    ),
    false
  );
$$;

revoke all on schema gcj_private from public, anon, authenticated;
revoke all on all tables in schema gcj_private from public, anon, authenticated;
revoke all on function gcj_private.authorized() from public, authenticated;
grant usage on schema gcj_private to anon;
grant execute on function gcj_private.authorized() to anon;

create table if not exists public.gcj_articles (
  id text primary key,
  slug text not null unique,
  section text not null,
  title text not null,
  dek text not null,
  body_json jsonb not null default '[]'::jsonb,
  key_points_json jsonb not null default '[]'::jsonb,
  author text not null,
  image_url text,
  image_alt text,
  image_credit text,
  sources_json jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  featured boolean not null default false,
  confidence integer not null default 0 check (confidence between 0 and 100),
  published_at timestamptz,
  updated_at timestamptz not null,
  created_at timestamptz not null
);

create index if not exists gcj_articles_status_published_idx on public.gcj_articles (status, published_at desc);
create index if not exists gcj_articles_status_created_idx on public.gcj_articles (status, created_at desc);
create index if not exists gcj_articles_section_published_idx on public.gcj_articles (section, published_at desc);

create table if not exists public.gcj_sources (
  id text primary key,
  name text not null,
  feed_url text not null unique,
  homepage_url text not null,
  section text not null,
  trust_tier integer not null default 2,
  active boolean not null default true,
  last_fetched_at timestamptz
);

create table if not exists public.gcj_story_candidates (
  id text primary key,
  source_id text not null references public.gcj_sources(id) on delete cascade,
  external_url text not null unique,
  title text not null,
  summary text not null default '',
  published_at timestamptz,
  discovered_at timestamptz not null,
  status text not null default 'new' check (status in ('new', 'selected', 'processed', 'rejected')),
  score integer not null default 0
);

create index if not exists gcj_candidates_status_score_idx on public.gcj_story_candidates (status, score desc);

create table if not exists public.gcj_pipeline_runs (
  id text primary key,
  run_type text not null,
  status text not null check (status in ('running', 'succeeded', 'partial', 'failed')),
  started_at timestamptz not null,
  completed_at timestamptz,
  metrics_json jsonb not null default '{}'::jsonb,
  error text
);

create index if not exists gcj_pipeline_runs_started_idx on public.gcj_pipeline_runs (started_at desc);

create table if not exists public.gcj_corrections (
  id text primary key,
  article_id text not null references public.gcj_articles(id) on delete cascade,
  note text not null,
  corrected_at timestamptz not null
);

create index if not exists gcj_corrections_article_idx on public.gcj_corrections (article_id, corrected_at desc);

create table if not exists public.gcj_subscribers (
  id text primary key,
  email text not null unique,
  status text not null default 'pending' check (status in ('pending', 'active', 'unsubscribed')),
  created_at timestamptz not null,
  confirmed_at timestamptz
);

create table if not exists public.gcj_request_limits (
  key text primary key,
  count integer not null default 1,
  window_start bigint not null
);

create table if not exists public.gcj_editorial_actions (
  id text primary key,
  article_id text not null references public.gcj_articles(id) on delete cascade,
  action text not null check (action in ('drafted', 'published', 'rejected', 'reopened')),
  actor text not null default 'editorial-api',
  note text,
  created_at timestamptz not null
);

create index if not exists gcj_editorial_actions_article_created_idx on public.gcj_editorial_actions (article_id, created_at desc);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'gcj_articles',
    'gcj_sources',
    'gcj_story_candidates',
    'gcj_pipeline_runs',
    'gcj_corrections',
    'gcj_subscribers',
    'gcj_request_limits',
    'gcj_editorial_actions'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('alter table public.%I force row level security', table_name);
    execute format('revoke all on table public.%I from public, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to anon', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
    execute format('drop policy if exists gcj_server_access on public.%I', table_name);
    execute format(
      'create policy gcj_server_access on public.%I for all to anon using ((select gcj_private.authorized())) with check ((select gcj_private.authorized()))',
      table_name
    );
  end loop;
end;
$$;

comment on schema gcj_private is 'Private credentials for The Golden Coast Journal server-to-server Data API access.';
comment on table public.gcj_articles is 'The Golden Coast Journal articles; protected by a server-only RLS key.';
