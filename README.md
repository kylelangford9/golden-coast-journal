# The Golden Coast Journal

An independent, ad-free and paywall-free digital newspaper for California and the wider world.

## What is included

- Responsive front page, article, section, search, standards, corrections, RSS, sitemap and API routes
- Durable Cloudflare D1 newsroom database with versioned Drizzle migrations
- R2 binding for future original and properly licensed documentary photography
- Twice-hourly editorial loop that ingests allowlisted California, national, business, climate, science and world primary-source feeds, then deduplicates and scores candidates
- Structured AI drafting adapter with source-grounded prompts, confidence scoring and review-first publication controls
- Search and share metadata, article-specific social cards and an original publication social card
- An allowlisted image registry that rejects unapproved article imagery and preserves photo provenance
- Newsletter capture endpoint with validation and duplicate protection
- Protected editorial review queue with publish, reject and reopen actions plus a durable audit trail

## Editorial automation

The scheduled Worker runs at minutes 7 and 37 of every hour. It:

1. refreshes allowlisted primary-source feeds;
2. stores and scores new story candidates;
3. drafts up to two high-priority candidates when `OPENAI_API_KEY` is configured;
4. stores drafts in review by default; and
5. only auto-publishes low-risk NASA and NOAA briefs when `AUTO_PUBLISH=true` and the model confidence is at least 92; every other beat remains review-first.

The manual protected trigger is `POST /api/editorial/run` with `Authorization: Bearer <CRON_SECRET>`.

The same bearer secret protects `GET /api/editorial/queue` and `POST /api/editorial/articles/:id`, whose JSON action is `publish`, `reject` or `reopen`.

## Local development

```bash
npm install
npm run db:generate
npm run dev
```

Copy `.env.example` to `.dev.vars` for local editorial-loop testing. Never commit secrets.

## Quality gates

```bash
npm run lint
npm run build
npm audit --omit=dev
```

## Editorial principles

Automation assists with discovery, comparison and drafting. Published work remains governed by visible sourcing, no invented certainty, heightened review for sensitive claims and a permanent correction record. See `/standards`.

Photographs of real people, places and events must be authentic and attributable. Generative imagery is prohibited in documentary contexts. AI-assisted design is limited to logos, typography and clearly non-documentary graphics.
