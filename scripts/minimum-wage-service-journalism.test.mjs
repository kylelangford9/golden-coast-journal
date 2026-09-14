import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const content = readFileSync('lib/content.ts', 'utf8');
const imagery = readFileSync('lib/imagery.ts', 'utf8');
const start = content.indexOf("id: 'gcj-009'");
const end = content.indexOf("id: 'gcj-008'", start);
assert.ok(
  start >= 0 && end > start,
  'minimum-wage service story must be registered ahead of older stories',
);

const story = content.slice(start, end);
for (const fact of [
  '$17.40',
  '$16.90',
  'January 1, 2027',
  '$72,384',
  'salary portion',
  'duties and other requirements',
  'higher local',
  'industry wage order',
  'pay stub',
  'wage claims',
  'regardless of immigration status',
]) {
  assert.ok(
    story.includes(fact),
    `minimum-wage story is missing verified detail: ${fact}`,
  );
}

assert.ok(story.includes("author: 'Kyle Langford'"));
assert.equal((story.match(/https:\/\/www\.dir\.ca\.gov/g) || []).length, 3);
assert.ok(story.includes('Worker_inspects_construction.jpg'));
assert.ok(story.includes('public domain'));
assert.ok(imagery.includes('Ryan Hagerty / U.S. Fish and Wildlife Service'));
assert.ok(imagery.includes('File:Worker_inspects_construction.jpg'));

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
  'PASS minimum-wage story retains verified facts, sourcing and independence',
);
