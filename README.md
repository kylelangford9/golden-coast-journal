# The Golden Coast Journal

An independent California newspaper with no paywall, advertising or documentary AI imagery.

## Production architecture

- Next.js App Router deployed with the Vercel CLI
- Supabase Postgres persistence in isolated `gcj_*` tables inside the existing California Votes project
- Forced row-level security on every Journal table, with a server-only application key layered over the Supabase publishable key
- Vercel Cron newsroom runs at seven minutes past each hour
- Vercel AI Gateway drafting through short-lived OIDC credentials; no direct provider key is required in production
- Human review queue by default, with automatic publication disabled unless explicitly enabled
- Authentic, attributable documentary photography selected only from the approved asset registry

## Editorial pipeline

The protected `/api/editorial/run` route:

1. polls seven primary-source feeds;
2. records and scores new story candidates;
3. drafts at most two stories through `openai/gpt-5-mini` on Vercel AI Gateway;
4. stores new drafts in the review queue; and
5. records every drafting, publishing, rejection and reopening action.

Vercel Cron supplies `Authorization: Bearer $CRON_SECRET`. The same bearer credential protects the review queue and editorial action routes. `AUTO_PUBLISH` remains `false` in every environment.

## Audience and network measurement

The Journal is a disclosed, editorially independent member of the Kyle Langford project
network. Its footer uses campaign-tagged links and records `Network Referral` events;
arrivals from the network record `Network Arrival`; newly created subscriptions record
`Newsletter Signup`; and post-signup invitations record `Newsletter Invite Started`.
Duplicate addresses are acknowledged without recording a second conversion. These
actions are delivered to both Vercel Analytics and the privacy-light first-party
portfolio scorecard; a small in-browser queue prevents events from being lost while the
shared collector loads. Standard page views and performance data use Vercel Analytics
and Speed Insights.

The protected `/api/editorial/metrics` route returns publication, review queue, source
candidate, section and subscriber totals without exposing subscriber identities. It uses
the same `Authorization: Bearer $CRON_SECRET` credential as the other editorial routes.

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
