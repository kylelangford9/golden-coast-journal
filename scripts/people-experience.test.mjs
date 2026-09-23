import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { excerptAround } from '../lib/text.ts';

/**
 * The reader's layer over the people register: a name in the text that opens
 * a card, a page per person with every story that names them, an index of
 * everyone, and a card for where a story's picture came from.
 */

// --- Excerpts: the sentence a person appears in, with their name marked ----

const marked = ({ text, markStart, markEnd }) => text.slice(markStart, markEnd);

const first =
  'The bills signed are AB 1577 (Bauer‑Kahan), AB 2383 (Zbur), AB 2469 (Papan), according to the governor’s office. The press release adds figures.';
const bauer = first.indexOf('Bauer‑Kahan');
const opening = excerptAround(first, bauer, bauer + 'Bauer‑Kahan'.length);
assert.ok(
  opening.text.startsWith('The bills signed'),
  'a sentence that opens its paragraph keeps its first letter (it used to read "he bills")',
);
assert.equal(marked(opening), 'Bauer‑Kahan');
assert.ok(
  !opening.text.includes('The press release'),
  'one sentence, not the paragraph',
);

const middle =
  'The governor acted on Friday. Examples in the release include Hillary Rodham Clinton, Assemblymembers Rebecca Bauer-Kahan, Josh Lowenthal and Buffy Wicks. Advocates praised it.';
const wicks = middle.indexOf('Buffy Wicks');
const inside = excerptAround(middle, wicks, wicks + 11);
assert.ok(inside.text.startsWith('Examples in the release'));
assert.ok(inside.text.endsWith('Buffy Wicks.'));
assert.equal(marked(inside), 'Buffy Wicks');

const long = `${'Background clause that runs on and on, '.repeat(8)}and then Secretary Rubio called it a historic deal ${'with a long tail of detail, '.repeat(8)}ending here. Next sentence.`;
const rubio = long.indexOf('Rubio');
const trimmed = excerptAround(long, rubio, rubio + 5);
assert.ok(
  trimmed.text.length < 300,
  'a run-on sentence is cut down to something a list can show',
);
assert.ok(trimmed.text.startsWith('…') && trimmed.text.endsWith('…'));
assert.equal(
  marked(trimmed),
  'Rubio',
  'the mark still lands on the name after trimming',
);

// --- Names in the text open cards; cards live outside the paragraphs -------

const card = readFileSync('components/person-card.tsx', 'utf8');
const article = readFileSync('app/article/[slug]/page.tsx', 'utf8');
const css = readFileSync('app/globals.css', 'utf8');

assert.match(
  card,
  /popover="auto"/,
  'cards are native popovers: no script needed to open them',
);
assert.match(card, /popoverTarget=\{cardId\(mark\.slug\)\}/);
assert.match(
  card,
  /popoverTargetAction="hide"/,
  'a card can be closed from inside it',
);
const paragraph = card.slice(
  card.indexOf('export function MentionParagraph'),
  card.indexOf('export function PersonCards'),
);
assert.doesNotMatch(
  paragraph,
  /<section|<div/,
  'a paragraph holds buttons only; a block inside a <p> is invalid HTML and breaks hydration',
);
assert.match(
  article,
  /<MentionParagraph[\s\S]*?\/>\s*\)\)\}\s*<PersonCards people=\{linkedPeople\} \/>/,
  'the cards render once, after the body, not inside a paragraph',
);
assert.match(article, /peopleInStory\(article\)/);
assert.match(article, /<PersonCardTracker articleSlug=\{article\.slug\} \/>/);

// A closed popover is hidden by the browser's own `display: none`. A rule that
// sets `display` on a card unconditionally shows every card at once.
const baseCard = css.match(/\.person-card,\n\.photo-card \{[^}]*\}/)?.[0] || '';
assert.ok(baseCard, 'the shared card rule exists');
assert.doesNotMatch(baseCard, /display\s*:/, 'no display on a closed card');
assert.match(css, /\.photo-card:popover-open \{\s*display: grid;/);
assert.match(
  css,
  /\.person-card:popover-open,\n\.photo-card:popover-open \{\s*margin: auto;/,
  'the page resets zero the margins the browser centres a popover with',
);
assert.match(css, /\.person-mention-glue \{\s*white-space: nowrap;/);

// --- Person pages and the index ------------------------------------------

const person = readFileSync('app/people/[slug]/page.tsx', 'utf8');
const index = readFileSync('app/people/page.tsx', 'utf8');
const directory = readFileSync('components/people-directory.tsx', 'utf8');
const sitemap = readFileSync('app/sitemap.ts', 'utf8');
const header = readFileSync('components/site-header.tsx', 'utf8');

assert.match(
  person,
  /if \(!person\) notFound\(\);/,
  'no page for someone the Journal has not covered',
);
assert.match(person, /canonical: `\/people\/\$\{person\.slug\}`/);
assert.match(
  person,
  /\.replace\(\/<\/g, '\\\\u003c'\)/,
  'structured data cannot close its script tag',
);
assert.match(person, /<mark>/, 'the excerpt marks the name');
assert.match(
  person,
  /person\.portrait\.license/,
  'the portrait carries its licence',
);
assert.match(
  index,
  /await connection\(\)/,
  'coverage grows with every story, so the index is read per request',
);
assert.match(index, /canonical: '\/people'/);
assert.match(directory, /nothing a reader types leaves the page/);
assert.doesNotMatch(directory, /fetch\(/, 'filtering is local');
assert.match(sitemap, /'\/people',/);
assert.match(sitemap, /url: `\$\{origin\}\/people\/\$\{person\.slug\}`/);
assert.match(header, /'People',/);
assert.match(header, /item === 'People'\s*\?\s*'\/people'/);

// --- The picture's own card ----------------------------------------------

const photo = readFileSync('components/photo-provenance.tsx', 'utf8');
assert.match(photo, /Original file and licence/);
assert.match(photo, /None is generated by AI\./);
assert.match(photo, /href="\/standards"/);
assert.match(
  article,
  /imageAsset\?\.provenance_url \|\| approvedImage\.provenanceUrl \|\| null/,
  'the credit links to the provenance page the registry records, not to nowhere',
);

// --- Structured data: the people a story names, and whose picture it is ----

assert.match(
  article,
  /mentions: people\.map\(\(person\) => \(\{\s*'@type': 'Person',/,
  'each person named is an entity search engines can connect to their page',
);
assert.match(article, /url: `\$\{origin\}\/people\/\$\{person\.slug\}`/);
assert.match(
  article,
  /'@type': 'ImageObject',[\s\S]*?creditText: approvedImage\.credit/,
);
assert.match(article, /acquireLicensePage: imageAsset\.provenance_url/);
assert.match(person, /license: person\.portrait\.provenanceUrl/);

// --- Measurement only listens ----------------------------------------------

const tracker = readFileSync('components/person-card-tracker.tsx', 'utf8');
assert.match(tracker, /newState !== 'open'/, 'only openings are counted');
assert.match(tracker, /track\('Person Card Opened'/);
assert.match(tracker, /removeEventListener\('toggle'/);

console.log(
  'PASS names open cards, people have pages, pictures show their provenance',
);
