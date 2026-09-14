import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [pipeline, metrics, readme] = await Promise.all([
  readFile('lib/pipeline.ts', 'utf8'),
  readFile('app/api/editorial/metrics/route.ts', 'utf8'),
  readFile('README.md', 'utf8'),
]);

assert.match(pipeline, /const FEED_TIMEOUT_MS = 8_000/);
assert.match(pipeline, /const AI_DRAFT_TIMEOUT_MS = 75_000/);
assert.match(pipeline, /const REVIEW_QUEUE_LIMIT = 12/);
assert.match(pipeline, /const DRAFTS_PER_RUN = 1/);
assert.match(pipeline, /activeSources\.map\(async \(source\)/);
assert.match(pipeline, /signal: AbortSignal\.timeout\(AI_DRAFT_TIMEOUT_MS\)/);
assert.match(pipeline, /\.eq\('status', 'review'\)/);
assert.match(pipeline, /draftingSkipped = 'review_queue_limit'/);
assert.match(pipeline, /Unable to close stale pipeline runs/);
assert.match(pipeline, /\.update\(\{ status: 'selected' \}\)/);
assert.match(pipeline, /\.update\(\{ status: 'new' \}\)/);
assert.match(metrics, /automation: \{/);
assert.match(metrics, /staleRunning/);
assert.match(metrics, /last24Hours/);
assert.match(readme, /only while fewer than 12 drafts await review/);

console.log('Editorial pipeline resilience contract verified.');
