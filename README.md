# The Golden Coast Journal

An independent California newspaper with no paywall, advertising or documentary AI imagery.

## Production architecture

- Next.js App Router deployed with the Vercel CLI
- Supabase Postgres persistence in isolated `gcj_*` tables inside the existing California Votes project
- Forced row-level security on every Journal table, with a server-only application key layered over the Supabase publishable key
- Vercel Cron newsroom runs at seven minutes past each hour
- Vercel AI Gateway drafting through short-lived OIDC credentials; no direct provider key is required in production
- Newsroom tuning held in `gcj_editorial_settings`, so publication thresholds and queue limits change with a SQL update rather than a redeploy
- Authentic, attributable documentary photography selected per story from the approved `gcj_editorial_assets` registry

## Editorial pipeline

The protected `/api/editorial/run` route:

1. polls its primary-source feeds: the governor, Cal OES and the Attorney General, county newsrooms from Los Angeles to Contra Costa, LADWP, and the White House, NASA, NOAA, the Federal Reserve and UN News;
2. records and scores new story candidates by trust tier, age and the source's `priority` (local newsrooms 20, state 10, national and world 0), and records routine notices that match `skip_title_patterns` as rejected so they are never drafted;
3. drafts stories through `openai/gpt-5-mini` on Vercel AI Gateway in Kyle Langford’s authorized, professional newsroom voice, at the volume set by `drafts_per_run` and only while the review queue sits below `review_queue_limit`;
4. selects an approved photograph for each draft from `gcj_editorial_assets`, matching the desk first and then the headline and dek against each asset's keywords;
5. publishes the draft when `auto_publish` is on, the source carries `auto_publish`, and model confidence clears `min_confidence_to_publish`; otherwise it stores the draft in the review queue; and
6. records every drafting, publishing, rejection and reopening action.

Feed polling runs concurrently with an eight-second limit per source. Source-page reads and AI drafting are separately bounded, so a slow upstream cannot consume the full function lifetime. A later run closes any stale `running` ledger entry before beginning. Queue pressure pauses drafting without pausing source discovery; this keeps the review workload finite and preserves human review as a meaningful quality gate.

Vercel Cron supplies `Authorization: Bearer $CRON_SECRET`. The same bearer credential protects the review queue and editorial action routes.

Automatic publication is governed entirely by the database, not by a per-environment variable, so there is one switch and it is visible in one place:

```sql
-- stop automatic publication immediately
update public.gcj_editorial_settings set value = 'false'::jsonb where key = 'auto_publish';
-- publish more conservatively
update public.gcj_editorial_settings set value = '92'::jsonb where key = 'min_confidence_to_publish';
-- withdraw a single source
update public.gcj_sources set auto_publish = false where id = 'whitehouse';
-- stop polling a source altogether (code seeds a source only when its row is missing, so this holds for every source)
update public.gcj_sources set active = false where id = 'noaa';
-- let a desk lead less often
update public.gcj_sources set priority = 0 where id = 'ladwp';
```

A draft publishes only when all three agree: the `auto_publish` setting is true, the originating source is flagged `auto_publish`, and the model's confidence clears `min_confidence_to_publish`. Anything short of that falls to the review queue.

Imagery is never generated. `gcj_editorial_assets` carries a `check (ai_generated = false)` constraint, so an AI image cannot be stored even by direct SQL, and every row requires a credit and a provenance URL.

Imagery is also never hotlinked. A second constraint requires `url` to be a repo-relative path or a file in the project storage bucket, so a published article does not depend on a remote host staying reachable. Approved images are copied into `photos/editorial/`, while `credit` and `provenance_url` continue to name the photographer and the original page.

Future pipeline drafts carry Kyle Langford’s byline. The public author profile and standards page disclose the role of drafting assistance and define what the byline does and does not claim. Existing desk-bylined stories retain their original attribution.

## Audience and network measurement

The Journal is a disclosed, editorially independent member of the Kyle Langford project
network. Its footer uses campaign-tagged links and records `Network Referral` events;
arrivals from the network record `Network Arrival`; newly created subscriptions record
`Newsletter Signup`; and post-signup invitations record `Newsletter Invite Started`.
Duplicate addresses are acknowledged without recording a second conversion. These
actions are delivered to both Vercel Analytics and the privacy-light first-party
portfolio scorecard; a small in-browser queue prevents events from being lost while the
shared collector loads. Standard page views and performance data use Vercel Analytics
and Speed Insights. The author profile records one `Author Profile Viewed` event per
browser session in both measurement systems.

The protected `/api/editorial/metrics` route returns publication, review queue, source
candidate, section, subscriber and pipeline-health totals without exposing subscriber
identities. Pipeline health includes the latest run, its duration, stale-run count and
24-hour status totals. It uses the same `Authorization: Bearer $CRON_SECRET` credential
as the other editorial routes.

## News near Me

The homepage's News near Me button asks the browser for the reader's position only when
it is tapped. The browser rounds it to two decimal places (about a kilometer) and POSTs
it to `/api/near-me`, which names the nearest town from `lib/places-data.json`, picks
the stories with `lib/near-me.ts`, and stores and logs nothing; no geocoding service is
called. A story's places come from its county-newsroom source and from what its copy
names, as exactly as it allows: California's towns and neighbourhoods, landmarks (JPL,
Vandenberg, the ports, Lake Oroville), counties, including lists such as "Plumas,
Tehama and Lake counties", regions, states and countries. Each story is pinned at its
most exact place near the reader.

The stories appear on a map as mini front pages, which the reader can drag, pinch and
zoom like a map app; every story the Journal can place is on it. The map is drawn by the
Journal (`lib/near-me-map.ts`), not by a tile service that would learn where the reader
is; as it moves, the browser POSTs the area on screen to `/api/near-me/map` for the
detail that area needs, and the relief tiles it does not already hold. It is drawn as an
atlas is: the land (the Census Bureau's 1:500,000 shoreline in the United States,
Natural Earth elsewhere), shaded relief, built-up areas, parks and forests, lakes and
rivers, state and county lines, freeways, highways and main roads, and the names of
towns, water, parks, states and countries, each layer only at the scales it reads at.
Pages, bubbles and names are laid out in the browser (`lib/paper-layout.ts`).

The gazetteer is GeoNames' `cities15000` and California's places from `cities1000`
(CC BY 4.0, credited in the panel), the Census Bureau's county gazetteer and its outlines
of California's counties; rebuild it with `npm run places:build`. `npm run map:build`
rebuilds `lib/map-data.json` (Natural Earth, the Census Bureau's cartographic boundaries
and urban areas, and TIGER/Line roads, parks, airports and water) and `lib/relief.bin`
(shaded relief from the Terrain Tiles on AWS, SRTM, USGS, GMTED2010 and ETOPO1); the
script names each source. Measurement records `News Near Me` with the
outcome only, never the place, `News Near Me Page Selected` and `News Near Me Story
Selected`.

## Local development

```bash
vercel link
vercel env pull .env.local --yes
npm install
npm run dev
```

Delay the pipeline until you have a current local `VERCEL_OIDC_TOKEN`; locally pulled OIDC tokens expire and should be refreshed with `vercel env pull`.

## Verification

```bash
npm run lint
npm run typecheck
npm run build
vercel deploy --prod
```

Database changes live in `supabase/migrations`. Photographs of people, places and events must be real and attributable. Generative tooling may be used only for logos, typography or clearly non-documentary graphic design.
