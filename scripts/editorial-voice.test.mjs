import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const voice = readFileSync('lib/editorial-voice.ts', 'utf8');
const pipeline = readFileSync('lib/pipeline.ts', 'utf8');
const standards = readFileSync('app/standards/page.tsx', 'utf8');
const authorPage = readFileSync('app/authors/kyle-langford/page.tsx', 'utf8');
const articlePage = readFileSync('app/article/[slug]/page.tsx', 'utf8');

for (const requiredRule of [
  'Kyle Langford Simulator repository',
  'measurable outcomes',
  'verified news',
  'strongest evidence',
  'practical consequence',
  'what is not yet known',
  'private biographical',
  'Journal standards override style',
]) {
  assert.ok(
    voice.includes(requiredRule),
    `voice guide is missing: ${requiredRule}`,
  );
}

assert.ok(pipeline.includes('JOURNAL_DRAFT_INSTRUCTIONS'));
assert.ok(pipeline.includes('author: KYLE_LANGFORD_AUTHOR.name'));
assert.ok(!pipeline.includes("author: 'Golden Coast Journal Desk'"));
assert.ok(standards.includes('authorized editorial voice'));
assert.ok(authorPage.includes('accountable author'));
assert.ok(articlePage.includes("'@type': 'Person'"));

console.log(
  'PASS Kyle Langford newsroom voice, byline and disclosure are wired',
);
