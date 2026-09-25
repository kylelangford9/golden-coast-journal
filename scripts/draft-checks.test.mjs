import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  draftProblems,
  figuresIn,
  figuresInSource,
  normalizeForComparison,
  quotationInSource,
  unsourcedJurisdictionCounts,
} from '../lib/draft-checks.ts';

/**
 * A machine-written draft publishes itself only if it passes these checks.
 * The fixture holds stories as the pipeline published them on Sept. 24, 2026,
 * each beside the source page the model was given and the copy-edited version
 * that replaced it: every published draft must fail, and every edited one pass.
 */
const FIXTURE = JSON.parse(
  readFileSync(new URL('./draft-checks.fixture.json', import.meta.url), 'utf8'),
);
const story = (name) => FIXTURE.find((entry) => entry.name === name);

// --- Worksheet labels -----------------------------------------------------

for (const name of ['ai-letter', 'kelso', 'bridge', 'wings', 'ballot'])
  assert.ok(
    draftProblems(story(name).published, story(name).sourceText).some(
      (problem) => problem.startsWith('worksheet labels'),
    ),
    `${name}: a paragraph opening "Verified:" or "Practical consequence:" is a worksheet, not copy`,
  );

const clean = {
  title: 'County closes a bridge',
  dek: 'Work runs Oct. 5 to Dec. 31.',
  body: [
    'What began as a water stop became a town, the county said.',
    'The county did not give a date for the flight.',
  ],
  keyPoints: ['The bridge closes Oct. 5.'],
};
assert.deepEqual(
  draftProblems(clean, 'The bridge closes Oct. 5 and reopens Dec. 31.'),
  [],
  'attribution inside a sentence is not a label',
);

// --- Quotations -----------------------------------------------------------

const governor = normalizeForComparison(story('ballot').sourceText);
assert.ok(
  quotationInSource('that the seizure of the ballots was unlawful.', governor),
);
assert.equal(
  quotationInSource(
    'Today’s ruling affirms that in California we will defend democracy; using every branch of government.',
    governor,
  ),
  false,
  'a semicolon where the governor used a dash alters the quotation',
);
assert.ok(
  quotationInSource(
    'Today’s ruling affirms that in California we will defend democracy',
    governor,
  ),
  'quoting up to the dash is faithful',
);
assert.ok(
  quotationInSource('People deserve to know … their ballot is counted', governor),
  'an elision is allowed when each side is in the source',
);
assert.equal(
  quotationInSource('People deserve to know … their ballot is final', governor),
  false,
  'but each side must be',
);
assert.ok(
  quotationInSource(
    'People deserve to know their ballot is counted and secure. And the new laws I signed just last week add new protections',
    governor,
  ),
  'a quotation may join sentences the source keeps apart',
);
assert.ok(
  draftProblems(
    { ...clean, body: ['“We will never stop,” the governor said.'] },
    story('ballot').sourceText,
  ).some((problem) => problem.startsWith('quotation not found')),
  'an invented quotation is held',
);
assert.ok(
  draftProblems(
    {
      ...clean,
      body: ['“Today’s ruling affirms that in California we will defend democracy — using every branch of government.”'],
    },
    story('ballot').sourceText,
  ).some((problem) => problem.startsWith('a quotation contains a dash')),
  'a quotation with a dash is held, because house punctuation would change it',
);

// --- Figures --------------------------------------------------------------

assert.deepEqual(
  [...figuresIn('31 dogs, 2,500 tons, $96.5 million, the 1940s, 59th, CO2e, H-1B, 6:36 p.m.')].sort(),
  ['1940', '2500', '31', '36', '59', '6', '96.5'].sort(),
);
assert.ok(figuresInSource('It cost $1,300.50 in 1937.').has('1300.50'));
assert.deepEqual(
  draftProblems(
    {
      title: 'Dogs fly out',
      dek: 'A rescue flight.',
      body: ['The flight carried 32 dogs.'],
      keyPoints: ['A flight carried dogs.'],
    },
    'The flight carried 31 dogs.',
  ),
  ['figures not in the source: 32'],
);

// --- Counts attached to the wrong noun ------------------------------------

const letter = story('ai-letter').sourceText;
assert.deepEqual(
  unsourcedJurisdictionCounts('Bonta joins 25-state coalition', letter),
  ['25 state'],
  '25 attorneys general, including D.C. and American Samoa, are not 25 states',
);
assert.deepEqual(
  unsourcedJurisdictionCounts('Bonta joined 25 state attorneys general', letter),
  ['25 state'],
);
assert.deepEqual(
  unsourcedJurisdictionCounts('Bonta joined 25 attorneys general', letter),
  [],
);
assert.deepEqual(
  unsourcedJurisdictionCounts(
    'Projects ran in 51 counties.',
    'Over 400 projects in 51 counties including the program.',
  ),
  [],
  'a count the source makes in the same terms passes, singular or plural',
);
assert.deepEqual(
  unsourcedJurisdictionCounts(
    'Buildings will be lit Nov. 4–11 county-wide, and on Nov. 11 county offices close.',
    'Lit from Nov. 4-11.',
  ),
  [],
  'a date is not a count',
);
assert.deepEqual(
  unsourcedJurisdictionCounts(
    'California and a coalition of 47 states and territories filed the plan.',
    'filed by California and a coalition of 47 other states and territories',
  ),
  [],
  'the source may put a word between the figure and the noun',
);

// --- Shape ----------------------------------------------------------------

assert.ok(
  draftProblems(story('ai-letter').published, story('ai-letter').sourceText).some(
    (problem) => problem.startsWith('headline runs'),
  ),
);
assert.ok(
  draftProblems(story('kelso').published, story('kelso').sourceText).includes(
    'a key point runs on or breaks across lines',
  ),
);

// --- The copy that replaced them passes -----------------------------------

for (const name of ['ai-letter', 'kelso', 'bridge', 'wings'])
  assert.deepEqual(
    draftProblems(story(name).revised, story(name).sourceText),
    [],
    `${name}: the edited story passes against its own source`,
  );
assert.ok(
  draftProblems(story('ballot').revised, story('ballot').sourceText).some(
    (problem) => problem.startsWith('figures not in the source'),
  ),
  'the edited ballot story also draws on the attorney general’s release, so the governor’s page alone does not support it',
);

console.log('PASS a draft publishes itself only if its copy is clean and sourced');
