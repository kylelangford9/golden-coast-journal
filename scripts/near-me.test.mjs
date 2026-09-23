import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  distanceLabel,
  nearestTown,
  storiesNear,
  storyGeo,
} from '../lib/near-me.ts';

/**
 * News near Me. Every case is a pattern from the 91 stories published by 23
 * September 2026, or a reader the feature must serve outside California.
 */

const g = JSON.parse(await readFile('lib/places-data.json', 'utf8'));

let day = 0;
const story = (slug, section, title, body, sources = []) => ({
  slug,
  section,
  title,
  dek: '',
  body: [body],
  keyPoints: [],
  sources: sources.map((url) => ({ url })),
  publishedAt: new Date(Date.UTC(2026, 8, 23) - (day += 1) * 3_600_000).toISOString(),
});
const places = (s) => storyGeo(g, s).places.map((place) => place.name);

// The reader: the nearest town, and in California the county from its outline.
const pasadena = nearestTown(g, 34.15, -118.14);
assert.equal(pasadena.town, 'Pasadena');
assert.equal(pasadena.region, 'California');
assert.equal(pasadena.countyKey, 'CA.037');
assert.equal(
  nearestTown(g, 34.58, -118.12).countyKey,
  'CA.037',
  'Palmdale is in Los Angeles County',
);
const denver = nearestTown(g, 39.74, -104.99);
assert.deepEqual([denver.town, denver.region, denver.countryCode], ['Denver', 'Colorado', 'US']);
const madrid = nearestTown(g, 40.42, -3.7);
assert.deepEqual([madrid.town, madrid.country], ['Madrid', 'Spain']);

// A county newsroom's release is set in that county.
const heat = story(
  'heat',
  'California',
  'Contra Costa County posts heat-safety guidance',
  'Cooling centers are open.',
  ['https://www.contracosta.ca.gov/10174/Heat-Safety-Tips-Places-to-Cool'],
);
assert.deepEqual(places(heat), ['Contra Costa County']);

// Which Pasadena, which Orange County: the one the story's state says, and
// in a California story the Californian one.
assert.deepEqual(
  places(story('jpl', 'Technology', 'JPL', "NASA's Jet Propulsion Laboratory in Pasadena, California, built it.")),
  ['Pasadena'],
);
assert.equal(
  storyGeo(g, story('jpl2', 'Technology', 'JPL', 'Built in Pasadena, California.')).places[0].lat > 34,
  true,
  'Pasadena, California, not Pasadena, Texas',
);
assert.deepEqual(
  places(story('oc', 'California', 'Beaches', 'Orange County reopened three beaches.')),
  ['Orange County'],
  'the county, not the city of Orange too',
);
assert.deepEqual(
  places(story('riv', 'California', 'Fair', 'The County of Riverside opened the fair.')),
  ['Riverside County'],
);
const newark = storyGeo(g, story('ewr', 'Nation', 'Airport', 'Flights resumed at Newark after the storm.'));
assert.ok(newark.regions.has('US.NJ'), 'outside a California story, Newark is New Jersey');

// "Washington" is the capital unless the copy says it is the state.
assert.ok(storyGeo(g, story('wh', 'Nation', 'Order', 'The order was signed in Washington.')).regions.has('US.DC'));
const waState = storyGeo(g, story('wa', 'Nation', 'Fires', 'Fires burned across Washington state.'));
assert.ok(waState.regions.has('US.WA') && !waState.regions.has('US.DC'));

// Names that are not places.
assert.deepEqual(
  places(story('judges', 'California', 'Judges', 'Newsom appointed Alexander Giza to the Second District. Giza, of Los Angeles County, is a Democrat.')),
  ['Los Angeles County'],
  'a judge named Giza is not in Egypt',
);
assert.deepEqual(
  places(story('council', 'California', 'Council', 'Councilmember Houston voted no.')),
  [],
  "Oakland's Councilmember Houston is not in Texas",
);
assert.deepEqual(
  places(story('kearny', 'California', 'Weather', 'The Kearny Mesa Weather Center opened in San Diego.')),
  ['San Diego'],
  'Kearny Mesa is not Mesa, Arizona',
);
assert.deepEqual(
  places(story('cosi', 'Technology', 'COSI', 'The Compton Spectrometer and Imager was assembled at UC Berkeley.')),
  ['Berkeley'],
);
assert.deepEqual(
  [...storyGeo(g, story('tundra', 'Climate', 'Tundra', 'A NASA and South Dakota State University analysis of Nunavut.')).regions],
  [],
  'a university named for a state is not a story set there',
);
assert.deepEqual(
  places(story('paris', 'Climate', 'Talks', 'Delegates recommitted to the Paris Agreement.')),
  [],
  'a treaty named for a city is not a story set there',
);
assert.deepEqual(
  places(story('lower', 'California', 'color', 'Leaves turn orange in the fall.')),
  [],
);
const refunds = story(
  'refunds',
  'Nation',
  'Refunds',
  'Refunds go to Alabama, Alaska, Arizona, Arkansas, Delaware, Florida, Hawaii and Indiana.',
);
assert.equal(storyGeo(g, refunds).regions.size, 0, 'a list of eight states is national news');

// The three groups, for readers in and out of California.
const stories = [
  heat,
  story('judges', 'California', 'Judges named', 'Newsom appointed judges in Alameda County.'),
  story('statewide', 'California', 'Emissions fell', 'California cut emissions.', ['https://www.gov.ca.gov/x']),
  story('socal', 'California', 'Credit', 'Customers across Southern California get a credit.'),
  story('spain', 'California', 'MOU with Spain', 'California and Spain signed an MOU.'),
  story('yemen', 'World', 'Yemen', 'Fighting near Taiz displaced families in Yemen.'),
  story('djibouti', 'Technology', 'Artemis', 'Djibouti signed the Artemis Accords in Washington.'),
];

const walnutCreek = nearestTown(g, 37.91, -122.06);
const wc = storiesNear(g, walnutCreek, stories);
assert.deepEqual(
  wc.near.map((hit) => [hit.story.slug, hit.where]),
  [
    ['heat', 'Contra Costa County'],
    ['judges', 'Alameda County · 8 mi'],
  ],
);
assert.deepEqual(
  wc.region.map((hit) => hit.story.slug),
  ['statewide', 'socal', 'spain'],
  'the rest of California, newest first',
);
assert.equal(wc.closest.length, 1, 'filled to six with the closest coverage');

const la = storiesNear(g, pasadena, stories);
assert.equal(la.near[0].story.slug, 'socal');

// Outside California: the closest coverage, with its distance.
const dv = storiesNear(g, denver, stories);
assert.equal(dv.near.length, 0);
assert.equal(dv.region.length, 0);
assert.equal(dv.closest.length, 5, 'every story that names a place; two name none');
assert.match(dv.closest[0].where, /^Southern California · \d+ mi$/);
assert.ok(dv.closest.every((hit, i, all) => i === 0 || all[i - 1].miles <= hit.miles));

// Abroad: stories about the reader's country, in kilometres.
const md = storiesNear(g, madrid, stories);
assert.deepEqual(md.region.map((hit) => [hit.story.slug, hit.where]), [['spain', 'Spain']]);
assert.match(md.closest[0].where, / km$/);
const sanaa = storiesNear(g, nearestTown(g, 15.35, 44.21), stories);
assert.deepEqual(
  sanaa.region.map((hit) => [hit.story.slug, hit.where]),
  [['yemen', 'Yemen']],
  'Taiz is a hundred miles from Sanaa, so the story is news for Yemen, not near',
);

// No story appears twice, and the groups hold at most eight.
for (const result of [wc, la, dv, md, sanaa]) {
  const slugs = [...result.near, ...result.region, ...result.closest].map((hit) => hit.story.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.ok(slugs.length <= 8);
}

assert.equal(distanceLabel(10, 'US'), '10 mi');
assert.equal(distanceLabel(10, 'ES'), '16 km');

console.log('PASS News near Me finds the stories set near a reader, in California or not');
