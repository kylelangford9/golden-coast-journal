import assert from 'node:assert/strict';

import {
  candidateScore,
  isPermanentFailure,
  rankCandidates,
} from '../lib/candidate-selection.ts';

/**
 * What the newsroom drafts next. Every case here is a pattern from the
 * candidate queue as it stood on 23 September 2026: 203 waiting items scored
 * 99 or 100 whatever their age, and a NOAA page answering 403 at the top.
 */

const NOW = Date.parse('2026-09-23T18:00:00Z');
const hoursAgo = (hours) => new Date(NOW - hours * 3_600_000).toISOString();
const item = (id, source_id, hours) => ({
  id,
  source_id,
  published_at: hoursAgo(hours),
  discovered_at: hoursAgo(Math.max(0, hours - 0.5)),
});

const SOURCES = [
  { id: 'whitehouse', trust_tier: 1, priority: 0 },
  { id: 'nasa', trust_tier: 1, priority: 0 },
  { id: 'govca', trust_tier: 1, priority: 10 },
  { id: 'lacounty', trust_tier: 1, priority: 20 },
  { id: 'wire', trust_tier: 2, priority: 0 },
];

// Freshness is measured when the newsroom drafts, not when it discovered.
const week = item('djibouti', 'nasa', 217);
const morning = item('arctic', 'whitehouse', 3);
assert.ok(
  candidateScore(morning, SOURCES[0], NOW) >
    candidateScore(week, SOURCES[1], NOW),
);

const { ranked, stale } = rankCandidates(
  [
    week,
    morning,
    item('utility-relief', 'govca', 12),
    item('measles', 'lacounty', 20),
    item('noaa-podcast', 'noaa', 1),
    item('wire', 'wire', 1),
  ],
  SOURCES,
  NOW,
  72,
);
assert.deepEqual(
  ranked.map((candidate) => candidate.id),
  ['measles', 'utility-relief', 'arctic', 'wire'],
  "a county's day-old alert leads, the governor's release follows, national news after",
);
assert.deepEqual(
  stale.map((candidate) => candidate.id),
  ['djibouti'],
  'a nine-day-old notice is retired, not published as news',
);
assert.ok(
  !ranked.some((candidate) => candidate.id === 'noaa-podcast') &&
    !stale.some((candidate) => candidate.id === 'noaa-podcast'),
  'an item from a switched-off source is neither drafted nor retired',
);

// A feed item with no date is judged by when it was found.
const undated = {
  id: 'undated',
  source_id: 'whitehouse',
  published_at: null,
  discovered_at: hoursAgo(80),
};
assert.deepEqual(
  rankCandidates([undated], SOURCES, NOW, 72).stale.map((c) => c.id),
  ['undated'],
);

// Failures that will happen again are told apart from ones that may clear.
assert.ok(isPermanentFailure('Source returned 403'));
assert.ok(isPermanentFailure('Source returned 404'));
assert.ok(isPermanentFailure('Source returned 410'));
assert.ok(!isPermanentFailure('Source returned 503'));
assert.ok(!isPermanentFailure('Source returned 429'));
assert.ok(!isPermanentFailure('The operation was aborted due to timeout'));
assert.ok(!isPermanentFailure('AI Gateway drafting failed with 403'));
assert.ok(!isPermanentFailure('Feed returned 404'));

console.log('PASS the newsroom drafts fresh news first and never sticks');
