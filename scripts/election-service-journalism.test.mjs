import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const content = readFileSync('lib/content.ts', 'utf8');
const imagery = readFileSync('lib/imagery.ts', 'utf8');
const articlePage = readFileSync('app/article/[slug]/page.tsx', 'utf8');
const nextConfig = readFileSync('next.config.ts', 'utf8');
const start = content.indexOf("id: 'gcj-007'");
const end = content.indexOf("id: 'gcj-001'", start);
assert.ok(
  start >= 0 && end > start,
  'election service story must be registered',
);

const story = content.slice(start, end);
for (const fact of [
  'October 5',
  'October 6',
  'October 19',
  'October 20 through November 3',
  'November 10',
  'December 3',
  'December 11',
]) {
  assert.ok(
    story.includes(fact),
    `election story is missing verified date: ${fact}`,
  );
}

assert.ok(story.includes("author: 'Kyle Langford'"));
assert.equal((story.match(/https:\/\/www\.sos\.ca\.gov/g) || []).length, 3);
assert.ok(story.includes('ca-state-capitol'));
assert.ok(imagery.includes('Wikimedia Commons (CC0)'));
assert.ok(imagery.includes('File:CA_State_Capitol.png'));
// Imagery is self-hosted; the Commons page survives only as provenance.
assert.ok(!imagery.includes('https://thumb.wikimedia.org'));
assert.ok(nextConfig.includes("hostname: 'eoifovdmuuqdcospamru.supabase.co'"));
assert.ok(articlePage.includes('new URL(article.imageUrl, origin).toString()'));
for (const affiliatedProject of [
  'LangBeat',
  'Anvil',
  'The One',
  'Qollar',
  'Calia',
  'Kyle Langford Simulator',
]) {
  assert.ok(
    !story.includes(affiliatedProject),
    `independent election coverage must not promote ${affiliatedProject}`,
  );
}

console.log(
  'PASS election service story retains verified dates, sourcing and independence',
);
