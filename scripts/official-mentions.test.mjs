import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  mentions,
  nameForms,
  normalizePunctuation,
  surnameBelongsToSomeoneElse,
  surnameOf,
} from '../lib/name-matching.ts';

/**
 * The mention portraits are only worth showing if they are the right face.
 * Every "should not match" case below is a sentence from a story that is
 * actually published, and every one of them put the wrong official's portrait
 * on the page before the adjacency guard existed.
 */

/** The surname-only branch: matched, and not talked out of it by the guard. */
const claims = (text, official) => {
  const padded = normalizePunctuation(` ${text} `);
  const lower = padded.toLowerCase();
  const surname = surnameOf(official);
  if (!mentions(lower, surname)) return false;
  return !surnameBelongsToSomeoneElse(padded, lower, surname, official);
};

/** The full-name branch, which counts outright. */
const namesOutright = (text, official) => {
  const lower = normalizePunctuation(` ${text} `).toLowerCase();
  return nameForms(official).some((form) => mentions(lower, form));
};

// Surnames the register cannot read off an initial.
assert.equal(surnameOf('Shirley N. Weber'), 'weber');
assert.equal(surnameOf('Tina S. McKinnor'), 'mckinnor');
assert.equal(surnameOf('Gavin Newsom'), 'newsom');

// --- False positives found in published articles -------------------------

assert.equal(
  claims(
    "Simon Stiell told European lawmakers that this summer's heat, floods and outages imposed heavy economic costs.",
    'Lateefah Simon',
  ),
  false,
  'the UN climate chief Simon Stiell is not Rep. Lateefah Simon',
);

assert.equal(
  claims(
    'Cal OES Director Caroline Thomas Jacobs said preparing resources ahead of severe fire weather improves the state’s ability to respond.',
    'Sara Jacobs',
  ),
  false,
  'Cal OES Director Caroline Thomas Jacobs is not Rep. Sara Jacobs',
);

assert.equal(
  claims(
    '“California’s innovation and spirit on the world stage,” said Reynold Hoover, CEO of LA28.',
    'Josh Hoover',
  ),
  false,
  'the LA28 chief executive is not Assemblymember Josh Hoover',
);

assert.equal(
  claims(
    'Media wishing to participate were instructed to contact the Johnson Space Center newsroom in Houston.',
    'Natasha Johnson',
  ),
  false,
  'Johnson Space Center is a NASA centre, not an assembly member',
);

assert.equal(
  claims(
    'NASA reports candidates completed classroom geology at Johnson Space Center, and used Johnson’s altitude chambers to simulate near vacuum.',
    'Natasha Johnson',
  ),
  false,
  'one giveaway occurrence should disqualify the surname for the whole story',
);

// --- Matches that must survive the guard ---------------------------------

assert.equal(
  claims(
    'The governor’s release lists three bills. AB 2411 (McKinnor) directs Cal OES to negotiate temporary deployment agreements.',
    'Tina S. McKinnor',
  ),
  true,
  'a bill author in parentheses is the most common true surname match',
);

assert.equal(
  claims(
    'The signed measures are SB 969 (Reyes), SB 1283 (Ashby), AB 1820 (Schiavo), SB 1267 (Allen) and SB 615 (Allen).',
    'Angelique Ashby',
  ),
  true,
  'punctuation between a surname and the next capitalised word is not adjacency',
);

assert.equal(
  claims(
    'The bills signed are AB 1577 (Bauer‑Kahan), AB 2383 (Zbur), AB 2469 (Papan) and SB 1168 (McNerney), according to the summary.',
    'Diane Papan',
  ),
  true,
  'a hyphenated or accented neighbour list should not break a real author match',
);

assert.equal(
  claims(
    'Governor Newsom proclaimed Sept. 17, 2026, as Constitution Day and Citizenship Day.',
    'Gavin Newsom',
  ),
  true,
  'an honorific in front of a surname is not another person',
);

assert.equal(
  claims('Newsom signed the measure on Friday.', 'Gavin Newsom'),
  true,
  'a lowercase word after a surname is no evidence against it',
);

assert.equal(
  claims('The bill now goes to Newsom. The Assembly adjourned.', 'Gavin Newsom'),
  true,
  'a sentence boundary is not adjacency',
);

// --- Misses: spellings the register and the copy desk disagree about -----

assert.equal(
  claims(
    'The bills signed are AB 1577 (Bauer‑Kahan), AB 2383 (Zbur) and AB 2469 (Papan).',
    'Rebecca Bauer-Kahan',
  ),
  true,
  'a non-breaking hyphen in the copy must still match the register’s plain one',
);

assert.equal(
  namesOutright(
    'Newsom signed the measure carried by Rebecca Bauer‑Kahan of Orinda.',
    'Rebecca Bauer-Kahan',
  ),
  true,
  'the full name matches across a non-breaking hyphen too',
);

assert.equal(
  namesOutright(
    '“California has long stood as a premier destination,” said Assemblymember Tina McKinnor.',
    'Tina S. McKinnor',
  ),
  true,
  'the newsroom drops the middle initial the register keeps',
);

assert.equal(
  namesOutright('The measure was carried by Tina S. McKinnor.', 'Tina S. McKinnor'),
  true,
  'the register’s own spelling must keep working',
);

assert.deepEqual(nameForms('Gavin Newsom'), ['gavin newsom']);
assert.deepEqual(nameForms('Shirley N. Weber'), [
  'shirley n. weber',
  'shirley weber',
]);
assert.equal(
  nameForms('Fiona Ma').length,
  1,
  'a two-part name has nothing to shorten',
);
assert.equal(surnameOf('Rebecca Bauer‑Kahan'), 'bauer-kahan');
assert.equal(normalizePunctuation('a‑b').length, 3, 'normalising must not move offsets');
assert.equal(normalizePunctuation('it’s').length, 4);

// --- The guard only ever narrows surname matching ------------------------

const people = readFileSync('lib/people.ts', 'utf8');
assert.match(
  people,
  /nameForms\(row\.name\)\.some\(\(form\) => mentions\(haystack, form\)\)\s*\)\s*score = 100;/,
  'a full-name match must still count outright, ungated by the guard',
);
assert.match(
  people,
  /surnameCounts\.get\(surname\) === 1 &&[\s\S]*?surnameBelongsToSomeoneElse\(/,
  'the guard belongs on the surname-only branch',
);
assert.ok(
  people.includes('const original = normalizePunctuation(` ${text} `);') &&
    people.includes('const haystack = original.toLowerCase();'),
  'the guard needs the original casing at the same offsets as the haystack',
);

// --- The surfaces must degrade to nothing, not to a broken frame ---------

const chip = readFileSync('components/official-chip.tsx', 'utf8');
const rail = readFileSync('components/official-mentions.tsx', 'utf8');
assert.ok(chip.includes('if (!official) return null;'));
assert.ok(rail.includes('if (!officials.length) return null;'));
assert.ok(
  chip.includes('alt=""'),
  'the chip states the name in text, so its portrait is decorative',
);
assert.ok(
  rail.includes('alt={official.name}'),
  'the rail portrait carries the name for a screen reader',
);

const styles = readFileSync('app/globals.css', 'utf8');
assert.match(styles, /\.official-portrait \{[^}]*border-radius: 50%;/);
assert.match(styles, /\.official-chip-portrait \{[^}]*border-radius: 50%;/);
assert.match(styles, /\.official-portrait img \{[^}]*object-position: center 22%;/);
assert.match(
  styles,
  /\.official-chip-portrait img \{[^}]*object-position: center 22%;/,
);

console.log(
  'PASS mention portraits name the right official, or nobody at all',
);
