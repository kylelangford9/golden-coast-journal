import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), 'utf8');

const [page, hub, pollData, homepage, header, footer, sitemap, newsletter] =
  await Promise.all([
    read('app/california-election-2026/page.tsx'),
    read('components/election-hub.tsx'),
    read('lib/polls.ts'),
    read('app/page.tsx'),
    read('components/site-header.tsx'),
    read('components/site-footer.tsx'),
    read('app/sitemap.ts'),
    read('components/newsletter-form.tsx'),
  ]);

assert.match(page, /canonical: '\/california-election-2026'/);
assert.match(page, /California Election 2026 Voter Guide/);
assert.match(page, /CollectionPage/);
assert.match(page, /EventScheduled/);
assert.match(page, /do not endorse a candidate or a vote/);
assert.match(page, /Journal does not receive the address/);
assert.match(page, /NewsletterForm placement="election-hub"/);
assert.match(page, /ReaderPulse pollId="election-help-priority-2026"/);

for (const destination of [
  '/california-candidates-2026',
  '/california-propositions-2026',
  '/california-deadlines',
  'californiavoters.live/',
  'voterguide.sos.ca.gov/',
  'voterstatus.sos.ca.gov/',
]) {
  assert.ok(hub.includes(destination), `missing destination ${destination}`);
}

for (const eventName of [
  'election_hub_opened',
  'election_hub_path_selected',
  'election_hub_official_source_opened',
  'election_hub_ballot_tool_selected',
]) {
  assert.ok(hub.includes(eventName), `missing metric ${eventName}`);
}

assert.doesNotMatch(
  hub,
  /candidate_name|party_preference|vote_choice|poll_answer|email|street_address/i,
);
assert.match(hub, /window\.sessionStorage/);
assert.match(pollData, /election-help-priority-2026/);
assert.match(homepage, /ElectionHubLink placement="homepage"/);
assert.match(header, /2026 Election/);
assert.match(footer, /href="\/california-election-2026"/);
assert.match(sitemap, /'\/california-election-2026'/);
assert.match(newsletter, /'election-hub'/);

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

console.log(
  'California election hub source, privacy, discovery and metrics checks passed.',
);
