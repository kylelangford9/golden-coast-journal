import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const content = readFileSync('lib/content.ts', 'utf8');
const imagery = readFileSync('lib/imagery.ts', 'utf8');
const start = content.indexOf("id: 'gcj-008'");
const end = content.indexOf("id: 'gcj-007'", start);
assert.ok(
  start >= 0 && end > start,
  'climate-credit service story must be registered',
);

const story = content.slice(start, end);
for (const fact of [
  '$36.18',
  '$36',
  '$49.36',
  '$17.52',
  '$111.83',
  '$71.98',
  '$46.26',
  '$32.58',
  '$45.57',
  '$36.06',
  'August and September',
  'April and October',
  'CA Climate Credit',
]) {
  assert.ok(
    story.includes(fact),
    `climate-credit story is missing verified detail: ${fact}`,
  );
}

assert.ok(story.includes("author: 'Kyle Langford'"));
assert.equal((story.match(/https:\/\/www\.cpuc\.ca\.gov/g) || []).length, 3);
assert.ok(story.includes('Path_27_Power_Lines_in_California_0.JPG'));
assert.ok(story.includes('amount may change'));
assert.ok(imagery.includes('Northwalker / Wikimedia Commons (CC0)'));
assert.ok(imagery.includes('File:Path_27_Power_Lines_in_California_0.JPG'));

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
  'PASS climate-credit story retains verified amounts, sourcing and independence',
);
