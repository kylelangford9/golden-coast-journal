import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  hasKeyword,
  normalizeForKeywords,
  pickEditorialAsset,
} from '../lib/asset-matching.ts';

/**
 * A story's photograph has to be about the story, or be one of its desk's
 * generic pictures; never a different story's picture that happened to share a
 * desk. Every headline below is published, and the "was" in each message is
 * the photograph it actually ran under.
 *
 * The registry is a snapshot of gcj_editorial_assets (active, article-eligible)
 * so the test runs the real keywords, not ones written to pass.
 */
const REGISTRY = JSON.parse(
  readFileSync(
    new URL('./editorial-assets.fixture.json', import.meta.url),
    'utf8',
  ),
);

const pick = (section, title, dek = '', rotationKey = title) =>
  pickEditorialAsset(REGISTRY, { section, title, dek, rotationKey })?.id;

// --- Whole words, not substrings -----------------------------------------

const hay = (text) => ` ${normalizeForKeywords(text)} `;
assert.equal(
  hasKeyword(
    hay('announces expanded international climate partnerships'),
    'national',
  ),
  false,
  '"national" must not fire inside "international"',
);
assert.equal(hasKeyword(hay('a hiking trail reopens'), 'rail'), false);
assert.equal(hasKeyword(hay('the governor said'), 'ai'), false);
assert.equal(
  hasKeyword(hay('Newsom signs six bills to speed EV chargers'), 'charger'),
  true,
  'a plural ending still matches',
);
assert.equal(
  hasKeyword(hay('appoints two superior-court judges'), 'superior court'),
  true,
  'a hyphen reads as a space',
);
assert.equal(
  hasKeyword(hay('Directs Flags at Half‑Staff'), 'half-staff'),
  true,
  'a non-breaking hyphen is a hyphen',
);
assert.equal(
  hasKeyword(hay('forecasters expect a strong El Niño'), 'el niño'),
  true,
);

// --- A topical picture, when the story names its subject ------------------

assert.equal(
  pick(
    'California',
    'Newsom declares state of emergency to prepare California for likely historic El Niño',
    'The governor ordered state agencies to pre-position equipment, streamline procurement and expand outreach; federal forecasters put the odds of a very strong El Niño this fall and winter above 90%.',
  ),
  'ca-flooded-orchard',
  'was the ballot drop box',
);
assert.equal(
  pick(
    'California',
    'Newsom names five appellate nominees, appoints two superior-court judges',
    'Governor Gavin Newsom announced five Court of Appeal nominations and two Superior Court appointments on Sept. 18, 2026; each appellate nominee must be confirmed by the Commission on Judicial Appointments, the governor’s office said.',
  ),
  'ca-supreme-court-sf',
  'was a wildfire crew',
);
assert.equal(
  pick(
    'California',
    "Newsom signs package that creates new felonies and reporting rules to 'protect' California elections",
    'Governor’s office announced Sept. 19, 2026 that the package makes seizure or directed seizure of ballots and other election materials a felony and adds reporting, cybersecurity and misinformation measures.',
  ),
  'ca-i-voted-sticker',
  'was a CAL FIRE engine',
);
assert.equal(
  pick(
    'California',
    'Newsom signs two bills expanding California film tax credits; creates new post-production credit',
    'Governor’s office says the legislation will support post-production workers and strengthen the state Film & Television Tax Credit Program.',
  ),
  'ca-warner-bros-water-tower',
  'was the Los Angeles Coliseum',
);
assert.equal(
  pick(
    'California',
    'Newsom signs six bills to speed EV chargers, expand choice and consumer information',
    'The governor’s office says the laws cut permitting and inspection barriers, expand charging at multifamily housing, and strengthen transparency for truck incentives.',
  ),
  'ca-ev-chargers-la',
  'was the Golden Gate Bridge',
);
assert.equal(
  pick(
    'Technology',
    'NASA’s Hubble Spots an Out-of-Sync Galaxy',
    'Hubble images show spiral galaxy NGC 4698 with a bulge tilted at right angles to its disk.',
  ),
  'hubble-in-orbit',
  'was the Goldstone antenna',
);

// --- Another desk's picture, when the story is plainly about it -----------

assert.equal(
  pick(
    'California',
    'Governor Newsom proclaims Sept. 17, 2026 as Constitution Day and Citizenship Day',
    'The governor posted a formal proclamation on the state website; the text emphasizes constitutional principles.',
  ),
  'us-constitution',
  'was a Central Valley farm; the Nation desk’s Constitution beats the California desk’s Capitol',
);
assert.equal(
  pick(
    'California',
    'Lake Oroville shifts into late-summer operations',
    'Water managers are balancing supply, environmental releases and recreation as the season turns.',
  ),
  'lake-oroville',
  'a named place beats a generic "lake" on another picture',
);
assert.equal(
  pick(
    'Business',
    'What California means when it says the grid is reliable',
    'Outage minutes, system demand and local equipment failures answer different questions.',
  ),
  'ca-power-lines',
  'a picture with no desk serves every desk',
);
assert.notEqual(
  pick(
    'California',
    'Newsom signs two bills expanding California film tax credits',
    '',
  ),
  'hollywood-sign',
  'a single loose word ("film") does not borrow another desk’s picture',
);
assert.notEqual(
  pick(
    'California',
    'Newsom signs broad slate of bills; vetoes others',
    'The Office of the Governor published a list on Sep. 20, 2026 naming dozens of bills the governor signed and a separate list he vetoed; the package covers climate, electricity planning, public safety, education and health.',
  ),
  'ca-power-lines',
  'a deskless picture needs its one word in the headline, not in a dek listing five subjects',
);

// --- Ties go to the topical, then the higher priority ---------------------

assert.equal(
  pick(
    'World',
    'UN Security Council to meet Thursday after reported Houthi attacks and Red Sea port capture',
    'Meeting set for 3 p.m. in New York after reports of Houthi strikes on Saudi Arabia and militants seizing a key Yemeni port.',
  ),
  'world-yemen-shibam',
  'a picture the registry has demoted does not win a tie',
);

// --- Nothing about the story: the desk's generic pictures, in rotation ----

const genericCalifornia = new Set(
  REGISTRY.filter(
    (row) => row.section === 'California' && row.is_section_default,
  ).map((row) => row.id),
);
assert.ok(
  genericCalifornia.size >= 2,
  'the desk needs more than one generic picture to rotate',
);
const slate = pick(
  'California',
  'Newsom signs broad slate of bills; vetoes others',
  '',
);
assert.ok(
  genericCalifornia.has(slate),
  `a story nothing matches gets a generic picture, not ${slate}`,
);
assert.equal(
  pick(
    'California',
    'Newsom signs broad slate of bills; vetoes others',
    '',
    'https://example/1',
  ),
  pick(
    'California',
    'Newsom signs broad slate of bills; vetoes others',
    '',
    'https://example/1',
  ),
  'a story keeps its picture from render to render',
);
const rotation = new Set(
  Array.from({ length: 24 }, (_, i) =>
    pick('California', 'Newsom signs broad slate of bills', '', `key-${i}`),
  ),
);
assert.ok(
  rotation.size > 1,
  'stories nothing matches do not all run the same picture',
);
assert.ok([...rotation].every((id) => genericCalifornia.has(id)));

const technology = pick(
  'Technology',
  'NASA NSSC Publishes Travel Reimbursement Guidance; per diem, ETDY and relocation rules clarified',
  'NASA’s National Support Services Contract (NSSC) travel page lists rules, forms and references.',
);
assert.notEqual(
  technology,
  'nasa-astronaut-training',
  'a named astronaut candidate is not a generic picture for any NASA story',
);

// --- The generic pools hold no pictures of identifiable people -----------

for (const id of [
  'nasa-astronaut-training',
  'ca-wildfire-crew',
  'ca-emergency-operations-center',
  'nation-sport-fishing',
])
  assert.ok(
    !REGISTRY.find((row) => row.id === id)?.is_section_default,
    `${id} shows people; it must not be a desk default`,
  );

console.log(
  'PASS each story draws a photograph about it, or its desk’s generic one',
);
