import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), 'utf8');
const [
  livePage,
  liveNewsroom,
  readerPulse,
  pollRoute,
  migration,
  homepage,
  header,
  footer,
  sitemap,
] = await Promise.all([
  read('app/live/page.tsx'),
  read('components/live-newsroom.tsx'),
  read('components/reader-pulse.tsx'),
  read('app/api/polls/route.ts'),
  read('supabase/migrations/20260914144000_gcj_reader_polls.sql'),
  read('app/page.tsx'),
  read('components/site-header.tsx'),
  read('components/site-footer.tsx'),
  read('app/sitemap.ts'),
]);

assert.match(livePage, /canonical: '\/live'/);
assert.match(livePage, /NewsletterForm placement="live"/);
assert.match(liveNewsroom, /300_000/);
assert.match(liveNewsroom, /not finished Journal reporting/);
for (const event of [
  'live_desk_opened',
  'live_story_selected',
  'live_refresh_requested',
]) {
  assert.ok(liveNewsroom.includes(event));
}

assert.match(readerPulse, /directional, not scientific/);
assert.match(readerPulse, /reader_poll_voted/);
assert.match(readerPulse, /trackPortfolioGrowth\('share_started', metadata\)/);
assert.match(readerPulse, /utm_source', 'reader_referral'/);
assert.match(readerPulse, /utm_medium', 'referral'/);
assert.match(readerPulse, /utm_campaign', 'journal_reader_poll'/);
assert.match(
  readerPulse,
  /const metadata = \{ poll_id: pollId, surface: 'reader_pulse' \}/,
);
assert.doesNotMatch(readerPulse, /option_id.*track|track.*option_id/s);

assert.match(pollRoute, /voterHash = await sha256/);
assert.match(pollRoute, /gcj_consume_rate_limit/);
assert.match(pollRoute, /contentLength > 2048/);
assert.doesNotMatch(pollRoute, /voter_token\s*:/i);
assert.doesNotMatch(pollRoute, /ip_address\s*:/i);

for (const clause of [
  'unique (poll_id, voter_hash)',
  'enable row level security',
  'force row level security',
  'security invoker',
  "set search_path = ''",
]) {
  assert.ok(migration.toLowerCase().includes(clause));
}

assert.match(homepage, /ReaderPulse pollId="coverage-priority-2026-09"/);
assert.match(homepage, /href="\/live"/);
assert.match(header, /item === 'Live Desk'\s*\?\s*'\/live'/);
assert.match(footer, /href="\/live"/);
assert.match(sitemap, /'\/live'/);

async function sourceFiles(directory) {
  const entries = await readdir(path.join(root, directory), {
    withFileTypes: true,
  });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(relative)));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(relative);
  }
  return files;
}

for (const file of [
  ...(await sourceFiles('app')),
  ...(await sourceFiles('components')),
  ...(await sourceFiles('lib')),
]) {
  assert.doesNotMatch(await read(file), /—/, `${file} contains an em dash`);
}

console.log('Live desk, reader polling, privacy, acquisition and voice checks passed.');
