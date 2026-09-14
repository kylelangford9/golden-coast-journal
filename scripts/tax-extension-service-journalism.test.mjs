import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const content = readFileSync('lib/content.ts', 'utf8');
const start = content.indexOf("id: 'gcj-011'");
const end = content.indexOf("id: 'gcj-010'", start);
assert.ok(
  start >= 0 && end > start,
  'tax-extension service story must be registered ahead of older stories',
);

const story = content.slice(start, end);
for (const fact of [
  'October 15',
  'tax year 2025',
  'automatic extension',
  'No state extension application is required',
  'Form 4868',
  'April 15, 2026',
  '$89,000',
  'CalFile',
  'not individualized tax advice',
]) {
  assert.ok(story.includes(fact), `tax-extension story is missing: ${fact}`);
}

assert.ok(story.includes("author: 'Kyle Langford'"));
assert.equal((story.match(/https:\/\/www\.ftb\.ca\.gov/g) || []).length, 3);
assert.equal((story.match(/https:\/\/www\.irs\.gov/g) || []).length, 3);

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
    `independent service coverage must not promote ${affiliatedProject}`,
  );
}

console.log(
  'PASS tax-extension story retains verified dates, sourcing and independence',
);
