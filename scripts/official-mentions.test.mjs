import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  foldAccents,
  matchPeople,
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

// --- Register spellings no story prints ----------------------------------

assert.equal(surnameOf('José Luis Solache Jr.'), 'solache', 'a suffix is not a surname');
assert.equal(surnameOf('Gilbert Ray Cisneros, Jr.'), 'cisneros');
assert.equal(surnameOf('Steven "Steve" Choi'), 'choi');
assert.ok(nameForms('Dr. Joaquin Arambula').includes('joaquin arambula'));
assert.ok(nameForms('José Luis Solache Jr.').includes('josé luis solache'));
assert.ok(nameForms('Gilbert Ray Cisneros, Jr.').includes('gilbert cisneros'));
assert.ok(nameForms('Steven "Steve" Choi').includes('steve choi'));
assert.ok(nameForms('Rick Chavez Zbur').includes('rick zbur'));

// --- The whole matcher, over a register shaped like the real one ---------

const REGISTER = [
  { name: 'Gavin Newsom', office: 'Governor' },
  { name: 'Pamela Price', office: 'Former District Attorney of Alameda County' },
  { name: 'Eric Grant', office: 'U.S. Attorney, Eastern District of California' },
  { name: 'Alex Padilla', office: 'U.S. Senator' },
  { name: 'Steve Padilla', office: 'State Senator' },
  { name: 'Jerry McNerney', office: 'State Senator' },
  { name: 'Susan Rubio', office: 'State Senator' },
  { name: 'Blanca E. Rubio', office: 'State Assembly Member' },
  { name: 'Marco Rubio', office: 'Secretary of State' },
  { name: 'Donald J. Trump', office: 'President of the United States' },
  { name: 'JD Vance', office: 'Vice President of the United States' },
  { name: 'Rebecca Bauer-Kahan', office: 'State Assembly Member' },
  { name: 'Josh Lowenthal', office: 'State Assembly Member' },
  { name: 'Buffy Wicks', office: 'State Assembly Member' },
  { name: 'Dawn Addis', office: 'State Assembly Member' },
  { name: 'Jacqui Irwin', office: 'State Assembly Member' },
  { name: 'Henry Stern', office: 'State Senator' },
  { name: 'Sara Jacobs', office: 'U.S. Representative' },
  { name: 'Caroline Thomas Jacobs', office: 'Director' },
  { name: 'Dr. Joaquin Arambula', office: 'State Assembly Member' },
  { name: 'Linda T. Sánchez', office: 'U.S. Representative' },
  { name: 'Natasha Johnson', office: 'State Assembly Member' },
  { name: 'Lateefah Simon', office: 'U.S. Representative' },
  { name: 'Simon Stiell', office: 'Executive Secretary' },
];
const named = (text) => matchPeople(text, REGISTER).map((hit) => hit.row.name);

// A surname that is also a word is only a name when it is written as one.
// Both sentences are from published stories, and both drew Pamela Price.
assert.deepEqual(
  named('It cited the Working Families Tax Cuts Act, executive orders on price transparency (February 2025) and drug pricing (May 2025).'),
  [],
  'lower-case "price" is a word, not the former Alameda County district attorney',
);
assert.deepEqual(
  named('Newsom demanded answers before military action on Iran, citing steep fuel-price impacts.'),
  ['Gavin Newsom'],
);
assert.deepEqual(
  named('Price caps take effect in January, and the price of insulin falls.'),
  [],
  'a capitalised word opening a sentence is still the word when the story uses it in lower case',
);
assert.deepEqual(named('District Attorney Price said charges would follow.'), ['Pamela Price']);
assert.deepEqual(named('The state will award a federal grant to counties.'), []);
assert.deepEqual(named('U.S. Attorney Grant announced the indictment.'), ['Eric Grant']);

// A bill number says which chamber its author sits in.
assert.deepEqual(
  named('The bills signed are SB 886 (Padilla and McNerney), SB 887 (Padilla), and SB 1168 (McNerney), according to the governor’s office.'),
  ['Steve Padilla', 'Jerry McNerney'],
  'a Senate bill author is the state senator, never the U.S. senator of the same surname',
);
assert.deepEqual(named('Sen. Padilla said the bill would pass.'), [], 'both Padillas are senators; nobody');

// A title is evidence for the person who holds it, and against everyone else.
assert.deepEqual(
  named('Secretary Rubio called it a "historic deal."'),
  ['Marco Rubio'],
  'the Secretary of State, not either California legislator named Rubio',
);
assert.deepEqual(
  named('President Trump Proclaims Patriot Day 2026, Directs Flags at Half‑Staff'),
  ['Donald J. Trump'],
  'a title-case headline verb beside a titled surname is not another person',
);
assert.deepEqual(
  named('First Lady Melania Trump toured the East Wing.'),
  [],
  'the First Lady is not the President',
);
assert.deepEqual(
  named('President Donald J. Trump and First Lady Melania Trump extended greetings to Jewish communities observing Rosh Hashanah.'),
  ['Donald J. Trump'],
);
assert.deepEqual(named('J.D. Vance told reporters the order stands.'), ['JD Vance']);
assert.deepEqual(named('Prime Minister Pedro Sánchez signed for Spain.'), []);
assert.deepEqual(
  named('Cal OES Director Caroline Thomas Jacobs said crews were in place. Jacobs added that more would follow.'),
  ['Caroline Thomas Jacobs'],
);
assert.deepEqual(named('Simon Stiell told European lawmakers the costs were rising.'), ['Simon Stiell']);
assert.deepEqual(named('Crews trained at Johnson Space Center in Houston.'), []);
assert.deepEqual(
  named('The measure was carried by Assemblymember Joaquin Arambula of Fresno.'),
  ['Dr. Joaquin Arambula'],
  'the register’s "Dr." is not part of the name the copy prints',
);

// Most prominent first. The published story names eight legislators and the
// rail shows four; alphabetical order used to cut the lead author.
const chatbots = named(
  'Newsom signs package of laws tightening child-safety rules for chatbots and social media. ' +
    'Those at the signing named in the release include Hillary Rodham Clinton, Assemblymembers Rebecca Bauer-Kahan, Josh Lowenthal, Buffy Wicks, Dawn Addis and Jacqui Irwin; Senators Steve Padilla, Susan Rubio and Henry Stern.',
);
assert.deepEqual(chatbots.slice(0, 4), [
  'Gavin Newsom',
  'Rebecca Bauer-Kahan',
  'Josh Lowenthal',
  'Buffy Wicks',
]);
assert.ok(chatbots.includes('Susan Rubio') && chatbots.includes('Steve Padilla'));

// --- Beyond California: accents, other names, foreign surnames -----------

// Folding keeps every offset, so a card still lands on the words it names.
assert.equal(foldAccents('Erdoğan, Türk, Sánchez'), 'Erdogan, Turk, Sanchez');
assert.equal(foldAccents('Erdoğan').length, 'Erdoğan'.length);

const WORLD = [
  ...REGISTER,
  {
    name: 'Recep Tayyip Erdoğan',
    office: 'President of Türkiye',
    level: 'International',
  },
  {
    name: 'Luiz Inácio Lula da Silva',
    office: 'President of Brazil',
    level: 'International',
    aliases: ['Lula', 'Lula da Silva'],
  },
  {
    name: 'Volodymyr Zelenskyy',
    office: 'President of Ukraine',
    level: 'International',
    aliases: ['Zelensky', 'Volodymyr Zelensky'],
  },
  {
    name: 'Xi Jinping',
    office: "President of the People's Republic of China",
    level: 'International',
    aliases: ['President Xi'],
  },
  {
    name: 'Sheikh Tamim bin Hamad Al Thani',
    office: 'Emir of Qatar',
    level: 'International',
    aliases: ['Sheikh Tamim', 'Tamim bin Hamad Al Thani'],
  },
  {
    name: 'Jens-Frederik Nielsen',
    office: 'Prime Minister of Greenland',
    level: 'International',
  },
  {
    name: 'Pedro Sánchez',
    office: 'Prime Minister of Spain',
    level: 'International',
  },
  {
    name: 'Tedros Adhanom Ghebreyesus',
    office: 'Director-General of the World Health Organization',
    level: 'International',
    aliases: ['Tedros'],
  },
];
const worldNamed = (text) =>
  matchPeople(text, WORLD).map((hit) => hit.row.name);
const worldSpans = (text, name) =>
  matchPeople(text, WORLD)
    .find((hit) => hit.row.name === name)
    ?.spans.map(({ start, end }) => text.slice(start, end));

// Wire copy drops the accents the register keeps, and the reverse.
const erdogan =
  'Turkish President Recep Tayyip Erdogan spoke first. Erdogan called for talks.';
assert.deepEqual(worldNamed(erdogan), ['Recep Tayyip Erdoğan']);
assert.deepEqual(worldSpans(erdogan, 'Recep Tayyip Erdoğan'), [
  'Recep Tayyip Erdogan',
  'Erdogan',
]);
assert.deepEqual(
  worldNamed('Prime Minister Sanchez of Spain and Rep. Sánchez of California.'),
  ['Pedro Sánchez', 'Linda T. Sánchez'],
  'a title settles an accented surname either way it is spelled',
);

// The names a story uses instead of the register's.
const lula =
  'President Luiz Inacio Lula da Silva opened the debate. Lula said the fund would double.';
assert.deepEqual(worldNamed(lula), ['Luiz Inácio Lula da Silva']);
assert.deepEqual(worldSpans(lula, 'Luiz Inácio Lula da Silva'), [
  'Luiz Inacio Lula da Silva',
  'Lula',
]);
assert.deepEqual(worldNamed('President Lula said the fund would double.'), [
  'Luiz Inácio Lula da Silva',
]);
assert.deepEqual(
  worldNamed(
    'Ukrainian President Volodymyr Zelensky asked for air defenses; Zelensky met Zelenskyy aides.',
  ),
  ['Volodymyr Zelenskyy'],
  'one person, however many of their names a story uses',
);
assert.deepEqual(worldNamed('President Xi did not attend.'), ['Xi Jinping']);
assert.deepEqual(
  worldNamed('Director-General Tedros said the outbreak was contained.'),
  ['Tedros Adhanom Ghebreyesus'],
);

// A foreign surname alone is not enough: it is too often something else.
assert.deepEqual(worldNamed('Viewership fell, according to Nielsen data.'), []);
assert.deepEqual(worldNamed('Nielsen said the audience grew 4 percent.'), []);
assert.deepEqual(worldNamed("Brazil's Lula was not at the meeting."), []);
assert.deepEqual(worldNamed('Greenland Premier Nielsen flew to Copenhagen.'), [
  'Jens-Frederik Nielsen',
]);

// Qatar's prime minister is an Al Thani too, and he is not the emir.
assert.deepEqual(
  worldNamed(
    "Qatar's prime minister, Sheikh Mohammed bin Abdulrahman Al Thani, said talks would resume.",
  ),
  [],
);
const qatar =
  'Emir Sheikh Tamim bin Hamad Al Thani received Prime Minister Mohammed bin Abdulrahman Al Thani.';
assert.deepEqual(worldSpans(qatar, 'Sheikh Tamim bin Hamad Al Thani'), [
  'Sheikh Tamim bin Hamad Al Thani',
]);

// --- Where each person is named, which is where their card opens --------

const spansOf = (text, name) => {
  const hit = matchPeople(text, REGISTER).find((h) => h.row.name === name);
  return hit ? hit.spans.map((span) => text.slice(span.start, span.end)) : [];
};
const whiteHouse =
  'President Donald J. Trump and First Lady Melania Trump extended greetings. Trump said the season was a time for renewal.';
assert.deepEqual(
  spansOf(whiteHouse, 'Donald J. Trump'),
  ['Donald J. Trump', 'Trump'],
  'the later bare surname is his; the First Lady’s surname is not a link to him',
);
assert.deepEqual(
  spansOf('The bills signed are SB 886 (Padilla and McNerney) and AB 1577 (Bauer‑Kahan).', 'Steve Padilla'),
  ['Padilla'],
);
assert.deepEqual(
  spansOf('The bills signed are SB 886 (Padilla and McNerney) and AB 1577 (Bauer‑Kahan).', 'Rebecca Bauer-Kahan'),
  ['Bauer‑Kahan'],
  'offsets are the reader’s own text, non-breaking hyphen and all',
);
assert.deepEqual(
  spansOf('Newsom signs bills\nGovernor Gavin Newsom signed them Friday; Newsom said more would follow.', 'Gavin Newsom'),
  ['Newsom', 'Gavin Newsom', 'Newsom'],
  'spans are in reading order, with a full name kept whole rather than split into its surname',
);

// --- The surface keeps the matcher's order and drops faceless rows last --

const people = readFileSync('lib/people.ts', 'utf8');
assert.match(
  people,
  /matchPeople\(text, rows\)\s*\.filter\(\(\{ row \}\) => row\.photo_url\)\s*\.slice\(0, limit\)/,
  'faceless rows are dropped only after matching, and nothing re-sorts the result',
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
