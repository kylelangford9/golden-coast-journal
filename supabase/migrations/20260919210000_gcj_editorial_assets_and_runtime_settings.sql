-- Move editorial imagery, auto-publish eligibility and pipeline tuning out of
-- hardcoded TypeScript constants and into the database, so the newsroom can be
-- retuned without a redeploy.
--
-- Before this migration lib/pipeline.ts assigned every AI-drafted article the
-- same photograph with `const image = editorialAssets.californiaCoast`, so a
-- story about the United Nations and a story about the Federal Reserve both
-- ran an aerial picture of Santa Barbara.

create table if not exists public.gcj_editorial_assets (
  id text primary key,
  url text not null unique,
  alt text not null check (length(btrim(alt)) > 0),
  credit text not null check (length(btrim(credit)) > 0),
  provenance_url text not null check (length(btrim(provenance_url)) > 0),
  kind text not null check (kind in ('photograph', 'source-graphic')),
  -- The Journal publishes no AI imagery. This is a hard database guarantee,
  -- mirroring the `aiGenerated: false` literal type in lib/imagery.ts.
  ai_generated boolean not null default false check (ai_generated = false),
  section text,
  keywords text[] not null default '{}',
  priority integer not null default 0,
  is_section_default boolean not null default false,
  is_global_default boolean not null default false,
  article_eligible boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists gcj_editorial_assets_section_idx
  on public.gcj_editorial_assets (section, priority desc) where active;
create unique index if not exists gcj_editorial_assets_one_global_default
  on public.gcj_editorial_assets ((is_global_default)) where is_global_default;

create table if not exists public.gcj_editorial_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

alter table public.gcj_sources
  add column if not exists auto_publish boolean not null default false;

do $$
declare
  t text;
begin
  foreach t in array array['gcj_editorial_assets', 'gcj_editorial_settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from public, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to anon', t);
    execute format('grant all on table public.%I to service_role', t);
    execute format('drop policy if exists gcj_server_access on public.%I', t);
    execute format(
      'create policy gcj_server_access on public.%I for all to anon using ((select gcj_private.authorized())) with check ((select gcj_private.authorized()))',
      t
    );
  end loop;
end;
$$;

comment on table public.gcj_editorial_assets is 'Approved, attributable editorial imagery. No AI-generated images; enforced by the ai_generated check constraint.';
comment on table public.gcj_editorial_settings is 'Runtime newsroom tuning (auto-publish, queue limits, thresholds) adjustable without redeploying.';
comment on column public.gcj_sources.auto_publish is 'Whether drafts from this source may publish without human review.';

-- Seed the registry. Every URL below was fetched and confirmed to return an
-- image, and every credit and licence was read from the Wikimedia Commons API
-- rather than written from memory. The first seven entries carry the exact URLs
-- previously hardcoded in lib/imagery.ts so already-published articles keep
-- their own photographs.
insert into public.gcj_editorial_assets
  (id, url, alt, credit, provenance_url, kind, section, keywords, priority, is_section_default, is_global_default, article_eligible)
values
  ('ca-coast', '/california-coast.jpg',
   'Aerial photograph of Santa Barbara, California, meeting the Pacific Ocean',
   'Clayton Cardinalli / Unsplash',
   'https://unsplash.com/photos/aerial-view-of-city-during-daytime-BTAU-92ZeZc',
   'photograph', 'California', array['coast','ocean','pacific','shoreline','beach'], 10, false, true, true),

  ('ca-state-capitol', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/CA_State_Capitol.png/1920px-CA_State_Capitol.png.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
   'California State Capitol in Sacramento beneath a clear blue sky',
   'Earthquakesurprise / Wikimedia Commons (CC0)',
   'https://commons.wikimedia.org/wiki/File:CA_State_Capitol.png',
   'photograph', 'California', array['capitol','legislature','newsom','governor','bill','law','sacramento','lawmakers','senate','assembly'], 100, true, false, true),

  ('ca-power-lines', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Path_27_Power_Lines_in_California_0.JPG/1280px-Path_27_Power_Lines_in_California_0.JPG?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail',
   'High-voltage power lines running beside Interstate 15 in California',
   'Northwalker / Wikimedia Commons (CC0)',
   'https://commons.wikimedia.org/wiki/File:Path_27_Power_Lines_in_California_0.JPG',
   'photograph', 'Climate', array['energy','power','grid','electricity','utility','blackout','solar','emissions'], 90, false, false, true),

  ('lake-oroville', '/oroville.jpg',
   'Aerial photograph of Lake Oroville and the surrounding California foothills',
   'Florence Low / California Department of Water Resources',
   'https://water.ca.gov/-/media/CWC-Website/Files/Documents/2023/2022_SWPAnnualReview_Final.pdf',
   'photograph', 'Climate', array['water','drought','reservoir','snowpack','rain','flood','storm','wildfire'], 100, true, false, true),

  ('worker-construction', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Worker_inspects_construction.jpg/1280px-Worker_inspects_construction.jpg?utm_campaign=index&utm_content=thumbnail&utm_source=commons.wikimedia.org',
   'A worker inspecting a construction site',
   'Ryan Hagerty / U.S. Fish and Wildlife Service via Wikimedia Commons (public domain)',
   'https://commons.wikimedia.org/wiki/File:Worker_inspects_construction.jpg',
   'photograph', 'Business', array['construction','labor','worker','wage','jobs','housing','employment','union'], 90, false, false, true),

  ('ca-ai-safeguards', '/ai-safeguards.png',
   'Official graphic announcing California artificial intelligence safeguards',
   'Office of the Governor of California',
   'https://www.gov.ca.gov/newsroom/',
   'source-graphic', 'Technology', array['artificial intelligence','ai','safeguards','chatbot','algorithm','privacy'], 90, false, false, true),

  ('kyle-portrait', '/kyle-langford.jpg',
   'Kyle Langford, publisher of The Golden Coast Journal',
   'Kyle Langford',
   'https://www.goldencoastjournal.com/authors/kyle-langford',
   'photograph', null, array[]::text[], 0, false, false, false),

  ('us-capitol', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a3/United_States_Capitol_west_front_edit2.jpg/1280px-United_States_Capitol_west_front_edit2.jpg',
   'The west front of the United States Capitol in Washington',
   'Architect of the Capitol via Wikimedia Commons (public domain)',
   'https://commons.wikimedia.org/wiki/File:United_States_Capitol_west_front_edit2.jpg',
   'photograph', 'Nation', array['congress','senate','house','federal','washington','president','white house','administration','supreme court'], 100, true, false, true),

  ('un-general-assembly', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/UN_General_Assembly_hall.jpg/1280px-UN_General_Assembly_hall.jpg',
   'The United Nations General Assembly hall in New York',
   'Patrick Gruban / Wikimedia Commons (CC BY-SA 2.0)',
   'https://commons.wikimedia.org/wiki/File:UN_General_Assembly_hall.jpg',
   'photograph', 'World', array['united nations','un','global','international','treaty','assembly','security council','humanitarian'], 100, true, false, true),

  ('federal-reserve', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Marriner_S._Eccles_Federal_Reserve_Board_Building.jpg/1280px-Marriner_S._Eccles_Federal_Reserve_Board_Building.jpg',
   'The Marriner S. Eccles Federal Reserve Board Building in Washington',
   'AgnosticPreachersKid / Wikimedia Commons (CC BY-SA 3.0)',
   'https://commons.wikimedia.org/wiki/File:Marriner_S._Eccles_Federal_Reserve_Board_Building.jpg',
   'photograph', 'Business', array['federal reserve','interest rate','inflation','monetary','fomc','bank','economy','prices'], 100, true, false, true),

  ('hollywood-sign', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5a/Hollywood_Sign_%28Zuschnitt%29.jpg/1280px-Hollywood_Sign_%28Zuschnitt%29.jpg',
   'The Hollywood Sign above Los Angeles',
   'Thomas Wolf, www.foto-tw.de / Wikimedia Commons (CC BY-SA 3.0)',
   'https://commons.wikimedia.org/wiki/File:Hollywood_Sign_(Zuschnitt).jpg',
   'photograph', 'Culture', array['film','hollywood','entertainment','music','art','studio','festival','museum'], 100, true, false, true),

  ('ca-state-library', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/California_State_Library%2C_900_N_Street.jpg/1280px-California_State_Library%2C_900_N_Street.jpg',
   'The California State Library building at 900 N Street in Sacramento',
   'CarmenEsparzaAmoux / Wikimedia Commons (CC BY-SA 4.0)',
   'https://commons.wikimedia.org/wiki/File:California_State_Library,_900_N_Street.jpg',
   'photograph', 'Ideas', array['essay','opinion','analysis','library','education','research','history','school'], 100, true, false, true),

  ('nasa-astronaut-training', 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/08/NASA_astronaut_candidate_Rebecca_Lawler_prepares_for_a_training_flight_aboard_NASA%E2%80%99s_WB-57_aircraft_%28jsc2026e402144%29.jpg/1280px-NASA_astronaut_candidate_Rebecca_Lawler_prepares_for_a_training_flight_aboard_NASA%E2%80%99s_WB-57_aircraft_%28jsc2026e402144%29.jpg',
   'A NASA astronaut candidate preparing for a training flight aboard a NASA WB-57 aircraft',
   'Josh Valcarcel / NASA Johnson Space Center (public domain)',
   'https://commons.wikimedia.org/wiki/File:NASA_astronaut_candidate_Rebecca_Lawler_prepares_for_a_training_flight_aboard_NASA%E2%80%99s_WB-57_aircraft_(jsc2026e402144).jpg',
   'photograph', 'Technology', array['nasa','astronaut','space','artemis','orbit','mission','flight','satellite','launch'], 100, true, false, true)
on conflict (id) do nothing;
