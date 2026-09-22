import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  candidateEvidence,
  disambiguateSameName,
  normalizePunctuation,
} from '../lib/name-matching.ts';

/**
 * Two Californians are called Robert Garcia: the U.S. representative for CA-42,
 * who was mayor of Long Beach before that, and the state assembly member for
 * AD-50 in San Bernardino County. Both are Democrats. Both are named outright
 * by the same three words, so both scored a full 100 on the same story and the
 * tie fell to `localeCompare` — which is to say to nothing at all. A reader
 * could open a story about the congressman and see the assembly member's face.
 *
 * The rows below are the two register entries as `representatives` actually
 * holds them, and the prose is written the way the wire writes it.
 */
const REP_GARCIA = {
  name: 'Robert Garcia',
  office: 'U.S. Representative',
  level: 'Federal',
  district: 'CA-42',
  city: 'Long Beach',
  county: null,
};

const ASSEMBLY_GARCIA = {
  name: 'Robert Garcia',
  office: 'State Assembly Member',
  level: 'State',
  district: 'AD-50',
  city: null,
  county: 'San Bernardino',
};

const GARCIAS = [REP_GARCIA, ASSEMBLY_GARCIA];

const pick = (text, candidates) =>
  disambiguateSameName(
    normalizePunctuation(` ${text} `).toLowerCase(),
    candidates,
  );

// --- The story says which man it means ----------------------------------

assert.equal(
  pick(
    'Rep. Robert Garcia pressed the agency for records on the deployment, his office said Thursday.',
    GARCIAS,
  ),
  0,
  'the honorific the newsroom prints for a congressman settles it',
);

assert.equal(
  pick(
    'Assemblymember Robert Garcia carried the measure, which cleared the Senate on a 29-9 vote.',
    GARCIAS,
  ),
  1,
  'the honorific the newsroom prints for an assembly member settles it',
);

assert.equal(
  pick(
    'The Long Beach Democrat, Robert Garcia, was first elected to Congress in 2022.',
    GARCIAS,
  ),
  0,
  'the city a member represents is disambiguating evidence',
);

assert.equal(
  pick(
    'Robert Garcia, whose San Bernardino County district takes in Rancho Cucamonga, said the funding was overdue.',
    GARCIAS,
  ),
  1,
  'the county a member represents is disambiguating evidence',
);

assert.equal(
  pick('Robert Garcia of AD-50 introduced the bill in February.', GARCIAS),
  1,
  'a district code is disambiguating evidence; a bare district number is not',
);

// --- The story does not, so nobody gets a portrait ----------------------

assert.equal(
  pick(
    'Robert Garcia called the decision a setback for California families.',
    GARCIAS,
  ),
  -1,
  'a bare full name settles nothing between namesakes',
);

assert.equal(
  pick(
    'Robert Garcia, a Democrat, said the state had waited long enough.',
    GARCIAS,
  ),
  -1,
  'a party both namesakes belong to is not evidence about either',
);

assert.equal(
  pick(
    'Rep. Robert Garcia asked for the audit, and Assemblymember Robert Garcia said the Assembly would hold its own hearing.',
    GARCIAS,
  ),
  -1,
  'a story about both namesakes has no single right face to lead with',
);

// --- The rule only applies to an actual collision ------------------------

assert.equal(
  pick('Nothing here names anyone.', [REP_GARCIA]),
  0,
  'a name only one person carries needs no disambiguation',
);

// A register that grows middle initials creates the same collision, because
// "Robert A. Garcia" also answers to "Robert Garcia". The fuller spelling is
// then itself the evidence.
const INITIALLED = [
  { ...REP_GARCIA, name: 'Robert A. Garcia' },
  ASSEMBLY_GARCIA,
];
assert.equal(
  pick('Robert A. Garcia declined to comment on the filing.', INITIALLED),
  0,
  'a middle initial the other namesake does not have is evidence',
);
assert.equal(
  pick('Robert Garcia declined to comment on the filing.', INITIALLED),
  -1,
  'the shared short spelling still settles nothing',
);

// --- Evidence is only ever what tells them apart -------------------------

const repTerms = new Set(candidateEvidence(REP_GARCIA));
const assemblyTerms = new Set(candidateEvidence(ASSEMBLY_GARCIA));
assert.ok(repTerms.has('robert garcia') && assemblyTerms.has('robert garcia'));
assert.ok(
  repTerms.has('long beach') && !assemblyTerms.has('long beach'),
  'the congressman is the one from Long Beach',
);
assert.ok(
  assemblyTerms.has('assemblymember') && !repTerms.has('assemblymember'),
  'only the assembly member is written about as an assemblymember',
);
assert.ok(
  ![...repTerms].some((term) => term.length <= 2 || !/[a-z]/.test(term)),
  'a bare number or a two-character token would fire on anything',
);

// Nothing about a person who is not a namesake may be weakened by this: a
// register where one person holds a name must still return that person.
assert.equal(
  disambiguateSameName('', [ASSEMBLY_GARCIA]),
  0,
  'an empty story still returns the only candidate there is',
);

// --- The matcher has to actually use it ----------------------------------

const people = readFileSync('lib/people.ts', 'utf8');
assert.match(
  people,
  /disambiguateSameName\(/,
  'lib/people.ts must resolve namesakes rather than sort them',
);
assert.ok(
  !/\.sort\(\(a, b\) => b\.score - a\.score \|\| a\.row\.name\.localeCompare\(b\.row\.name\)\)[\s\S]*hits\b/.test(
    people.slice(people.indexOf('const hits')),
  ) || people.includes('const resolved'),
  'the ordering must run over resolved people, not raw hits',
);
assert.match(
  people,
  /if \(pick >= 0\) resolved\.push\(group\[pick\]\);/,
  'an unresolved namesake group must be dropped, not defaulted',
);
assert.match(
  people,
  /gcj_newsmakers/,
  'the Journal register has to be one of the sources searched',
);
assert.match(
  people,
  /Promise\.allSettled/,
  'one register failing must not take the other down with it',
);

// A person the register knows about but has no publishable picture of is still
// worth loading: they are what stops a bare surname being credited to somebody
// else. They are only dropped once that work is done.
assert.ok(
  !/\.from\('(representatives|gcj_newsmakers)'\)[\s\S]{0,200}?not\('photo_url', 'is', null\)/.test(
    people,
  ),
  'faceless rows must be loaded, so that they raise the surname count',
);
assert.match(
  people,
  /resolved\s*\.filter\(\(\{ row \}\) => row\.photo_url\)/,
  'and dropped at the end, after namesake resolution, not before it',
);
assert.ok(
  people.indexOf('disambiguateSameName(') <
    people.indexOf('.filter(({ row }) => row.photo_url)'),
  'a namesake with a portrait must not win by default over one without',
);

console.log('PASS namesakes resolve to one face, or to none');
