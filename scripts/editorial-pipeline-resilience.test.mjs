import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [pipeline, settings, assets, metrics, readme] = await Promise.all([
  readFile('lib/pipeline.ts', 'utf8'),
  readFile('lib/editorial-settings.ts', 'utf8'),
  readFile('lib/editorial-assets.ts', 'utf8'),
  readFile('app/api/editorial/metrics/route.ts', 'utf8'),
  readFile('README.md', 'utf8'),
]);

assert.match(pipeline, /const FEED_TIMEOUT_MS = 8_000/);
assert.match(pipeline, /const AI_DRAFT_TIMEOUT_MS = 75_000/);

// Queue pressure, drafting volume and the publication threshold are read from
// gcj_editorial_settings, never hardcoded, so the newsroom retunes without a
// redeploy. Guard against a constant creeping back in.
assert.match(pipeline, /const settings = await getEditorialSettings\(\)/);
assert.match(pipeline, /reviewBacklog >= settings\.reviewQueueLimit/);
assert.match(pipeline, /\.limit\(settings\.draftsPerRun\)/);
assert.match(pipeline, /draft\.confidence >= settings\.minConfidenceToPublish/);
assert.doesNotMatch(pipeline, /const REVIEW_QUEUE_LIMIT/);
assert.doesNotMatch(pipeline, /const DRAFTS_PER_RUN/);
assert.doesNotMatch(pipeline, /autoPublishSourceIds/);
assert.doesNotMatch(pipeline, /confidence >= 9\d/);

// Auto-publication is governed by the database row plus the per-source flag.
assert.match(pipeline, /settings\.autoPublish/);
assert.match(pipeline, /source\.auto_publish === true/);
assert.match(settings, /gcj_editorial_settings/);
assert.match(settings, /autoPublish: false/);

// Imagery is selected per story from the approved registry, never a constant.
assert.match(pipeline, /const image = await selectEditorialAsset\(\{/);
assert.doesNotMatch(pipeline, /editorialAssets\.californiaCoast/);
assert.match(assets, /gcj_editorial_assets/);
assert.match(assets, /article_eligible/);
assert.match(assets, /aiGenerated: false/);

assert.match(pipeline, /activeSources\.map\(async \(source\)/);
assert.match(pipeline, /signal: AbortSignal\.timeout\(AI_DRAFT_TIMEOUT_MS\)/);
assert.match(pipeline, /\.eq\('status', 'review'\)/);
assert.match(pipeline, /draftingSkipped = 'review_queue_limit'/);
assert.match(pipeline, /webSubNotifications/);
assert.match(pipeline, /webSubFailures/);
assert.match(pipeline, /Unable to close stale pipeline runs/);
assert.match(pipeline, /\.update\(\{ status: 'selected' \}\)/);
assert.match(pipeline, /\.update\(\{ status: 'new' \}\)/);
assert.match(metrics, /automation: \{/);
assert.match(metrics, /staleRunning/);
assert.match(metrics, /last24Hours/);
assert.match(readme, /only while the review queue sits below `review_queue_limit`/);
assert.match(readme, /check \(ai_generated = false\)/);
assert.match(readme, /never hotlinked/);
assert.match(assets, /self-hosted/i);

// Local news leads: a source's priority is part of every candidate's score,
// and routine notices are recorded but never drafted.
assert.match(pipeline, /-\s*ageHours \+\s*\(source\.priority \|\| 0\)/);
assert.match(pipeline, /status: routine \? 'rejected' : 'new'/);
assert.match(settings, /skipTitlePatterns: asPatterns\(byKey\.get\('skip_title_patterns'\)\)/);
assert.match(settings, /skipTitlePatterns: \[\],/, 'no patterns by default: nothing is filtered unless the newsroom says so');
const migration = await readFile(
  'supabase/migrations/20260923180000_gcj_local_sources.sql',
  'utf8',
);
assert.match(migration, /add column if not exists priority integer not null default 0/);
assert.doesNotMatch(
  migration,
  /sanfranciscopolice|lapdonline|sheriff/i,
  'police newsrooms stay out until the publisher sets a policy for releases that name the unconvicted',
);

console.log('Editorial pipeline resilience contract verified.');
