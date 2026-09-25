import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [pipeline, settings, assets, metrics, readme, repository] = await Promise.all([
  readFile('lib/pipeline.ts', 'utf8'),
  readFile('lib/editorial-settings.ts', 'utf8'),
  readFile('lib/editorial-assets.ts', 'utf8'),
  readFile('app/api/editorial/metrics/route.ts', 'utf8'),
  readFile('README.md', 'utf8'),
  readFile('lib/repository.ts', 'utf8'),
]);

assert.match(pipeline, /const FEED_TIMEOUT_MS = 8_000/);
assert.match(pipeline, /const AI_DRAFT_TIMEOUT_MS = 75_000/);

// Queue pressure, drafting volume and the publication threshold are read from
// gcj_editorial_settings, never hardcoded, so the newsroom retunes without a
// redeploy. Guard against a constant creeping back in.
assert.match(pipeline, /const settings = await getEditorialSettings\(\)/);
assert.match(pipeline, /reviewBacklog >= settings\.reviewQueueLimit/);
assert.match(pipeline, /if \(drafted >= settings\.draftsPerRun\) break;/);
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

// Imagery is selected per story from the approved registry, never a constant:
// the model chooses from a shortlist by what each picture shows, and the
// keyword pick only fills in for a draft held for review.
assert.match(pipeline, /await photoOptionsForStory\(\{/);
assert.match(
  pipeline,
  /const image = draft\.photo\s*\?\s*toAsset\(draft\.photo\)\s*:\s*await selectEditorialAsset\(\{/,
);
assert.match(pipeline, /if \(!photo\) problems\.push\('no approved photograph shows this story'\)/);

// A draft publishes itself only if it passes lib/draft-checks.ts, checked as
// the model wrote it, and does not repeat a story already published.
assert.match(pipeline, /const problems = draftProblems\(draft, sourceText\)/);
assert.match(pipeline, /!draft\.problems\.length/);
assert.match(pipeline, /problems\.push\(`may repeat \/article\/\$\{duplicateOf\}`\)/);
assert.match(pipeline, /Checks: \$\{draft\.problems\.join\('; '\)\}/);

// A full queue pauses only sources that cannot publish themselves; all
// drafting stops at twice the limit.
assert.match(pipeline, /reviewBacklog >= settings\.reviewQueueLimit \* 2/);
assert.match(pipeline, /if \(reviewOnlyPaused && !canPublishItself\(source\)\) continue;/);
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
// A failed draft goes back in the queue only if the failure may clear; a page
// that refused the Journal is retired so it cannot hold the top slot forever.
assert.match(pipeline, /status: isPermanentFailure\(message\) \? 'rejected' : 'new'/);
// The queue is ranked at drafting time, stale items retired, a failed slot
// refilled within the run's time budget, and no source looked up per item.
assert.match(pipeline, /rankCandidates\(\s*waiting,\s*activeSources,/);
assert.match(pipeline, /settings\.maxCandidateAgeHours/);
assert.match(pipeline, /Date\.now\(\) - Date\.parse\(startedAt\) > DRAFTING_BUDGET_MS/);
assert.doesNotMatch(pipeline, /Unable to load candidate source/);
assert.match(settings, /maxCandidateAgeHours: 72,/);
// The seed runs on every page and run; it must never undo a source switched
// off in the database.
assert.match(
  repository,
  /from\('gcj_sources'\)\.upsert\(publicationSources, \{\s*onConflict: 'id',\s*ignoreDuplicates: true,/,
);
assert.match(metrics, /automation: \{/);
assert.match(metrics, /staleRunning/);
assert.match(metrics, /last24Hours/);
assert.match(readme, /once the review queue reaches `review_queue_limit` only sources whose drafts can publish themselves keep drafting/);
assert.match(readme, /lib\/draft-checks\.ts/);
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
