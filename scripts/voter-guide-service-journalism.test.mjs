import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const content = readFileSync('lib/content.ts', 'utf8');
const polls = readFileSync('lib/polls.ts', 'utf8');
const articlePage = readFileSync('app/article/[slug]/page.tsx', 'utf8');
const packageJson = readFileSync('package.json', 'utf8');
const start = content.indexOf("id: 'gcj-012'");
const end = content.indexOf("id: 'gcj-011'", start);

assert.ok(start >= 0 && end > start, 'voter guide story must be registered');
const story = content.slice(start, end);

for (const fact of [
  'September 24 through October 13',
  'October 5',
  'October 19',
  'state guide',
  'county guide',
  'vote-by-mail ballot',
]) {
  assert.ok(story.includes(fact), `voter guide story is missing: ${fact}`);
}

assert.ok(story.includes("author: 'Kyle Langford'"));
assert.ok(story.includes('https://voterguide.sos.ca.gov/'));
assert.equal((story.match(/https:\/\/www\.sos\.ca\.gov/g) || []).length, 3);
assert.ok(story.includes('CA_State_Capitol.png'));

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
    `independent voter guide coverage must not promote ${affiliatedProject}`,
  );
}

assert.ok(polls.includes("id: 'voter-guide-help-priority-2026'"));
assert.ok(articlePage.includes('pollId="voter-guide-help-priority-2026"'));
assert.ok(articlePage.includes('<PropositionGuideLink placement="article" />'));
assert.ok(articlePage.includes('<CandidateGuideLink placement="article" />'));
assert.ok(packageJson.includes('test:voter-guide'));

for (const source of [content, polls, articlePage]) {
  assert.doesNotMatch(source, /—/, 'authored Journal source must not contain em dashes');
}

console.log(
  'PASS voter guide story retains official sourcing, useful actions, reader polling and editorial independence',
);
