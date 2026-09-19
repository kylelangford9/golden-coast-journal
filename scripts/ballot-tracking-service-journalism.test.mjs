import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const content = readFileSync('lib/content.ts', 'utf8');
const start = content.indexOf("id: 'gcj-010'");
const end = content.indexOf("id: 'gcj-009'", start);
assert.ok(
  start >= 0 && end > start,
  'ballot-tracking service story must be registered ahead of older stories',
);

const story = content.slice(start, end);
for (const fact of [
  'all 58 counties',
  'email, text or voice',
  'My Voter Status',
  'Only the registered voter',
  'October 27',
  '5 p.m. on November 25',
  'Procedures vary by county',
]) {
  assert.ok(
    story.includes(fact),
    `ballot-tracking story is missing verified detail: ${fact}`,
  );
}

assert.ok(story.includes("author: 'Kyle Langford'"));
assert.equal((story.match(/https:\/\/www\.sos\.ca\.gov/g) || []).length, 5);
assert.ok(story.includes('photos/editorial/ca-state-capitol.jpg'));
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
    `independent ballot coverage must not promote ${affiliatedProject}`,
  );
}

console.log(
  'PASS ballot-tracking story retains verified actions, dates and independence',
);
