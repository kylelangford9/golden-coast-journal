import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  WORLD,
  drawRegion,
  frameView,
  projectionFor,
  toWorld,
  widen,
  worldMiles,
} from '../lib/near-me-map.ts';
import { chooseLabels, groupStories, placePages } from '../lib/paper-layout.ts';

/**
 * The News near Me map: drawn on the Journal's server for the part of the
 * world in view, and laid out in the browser so every front page can be read.
 */

const [base, places] = await Promise.all([
  readFile('lib/map-data.json', 'utf8').then(JSON.parse),
  readFile('lib/places-data.json', 'utf8').then(JSON.parse),
]);

// The projection is centred on the reader, so a view from Tokyo to California
// runs east across the Pacific rather than west across Asia and Europe.
const tokyo = projectionFor({ lat: 35.68, lon: 139.69 });
assert.ok(toWorld(tokyo, 37.77, -122.42).x > 0, 'San Francisco is east of Tokyo on the map');
assert.ok(toWorld(tokyo, 28.61, 77.21).x < 0, 'New Delhi is west of it');

// The first view holds the reader, the ring round them and every point.
const reader = { lat: 34.05, lon: -118.05 };
const la = projectionFor(reader);
const points = [
  { lat: 34.098, lon: -118.327 },
  { lat: 34.201, lon: -118.171 },
];
const view = frameView(la, reader, points, 10, 1, 0.26);
for (const point of [reader, ...points]) {
  const at = toWorld(la, point.lat, point.lon);
  assert.ok(at.x > view.x && at.x < view.x + view.w && at.y > view.y && at.y < view.y + view.h);
}
assert.ok(Math.abs(view.w / view.h - 1) < 1e-9, 'square on a phone');
assert.ok(view.w >= 2 * worldMiles(10), 'at least ten miles round the reader');

// The drawing for a view: whole world units, steps after the first point, and
// county lines only close in.
const close = drawRegion(base, places.countyShapes, la, widen(view, 0.5), 2, ['CA.037']);
assert.match(close.land, /^M-?\d+ -?\d+l/);
assert.doesNotMatch(close.land + close.states + close.counties, /NaN|Infinity/);
assert.ok(close.counties.length > 0, 'county lines close in');
assert.ok(close.highlight.length > 0, 'the reader’s county is drawn when asked for');
const far = drawRegion(base, places.countyShapes, la, widen(view, 20), 200, []);
assert.equal(far.counties, '', 'no county lines at the scale of a continent');
assert.equal(far.states, '', 'no state lines at the scale of the world');
assert.ok(far.land.length < 200_000, 'a world view stays small enough to send');

// Towns to name come largest first and only from inside the view.
const named = drawRegion(base, places.countyShapes, la, view, 2, [], [
  ['Los Angeles', 34.05, -118.24, 3_800_000],
  ['El Monte', 34.07, -118.03, 110_000],
  ['San Diego', 32.72, -117.16, 1_400_000],
]).labels.map(([name]) => name);
assert.deepEqual(named, ['Los Angeles', 'El Monte']);

// Front pages: stories closer than a page's width are one stack; each stack
// gets a page where one fits, and becomes a bubble where none does.
const groups = groupStories(
  ['a', 'b', 'c', 'd'],
  [
    { x: 100, y: 100 },
    { x: 104, y: 102 },
    { x: 300, y: 250 },
    { x: 305, y: 255 },
  ],
  30,
);
assert.deepEqual(groups.map((g) => g.members), [[0, 1], [2, 3]]);
const size = { w: 90, h: 90 };
const pages = placePages(groups, [], 400, 400, size, 7, new Map());
assert.equal(pages.size, 2, 'two stacks far apart both get pages');
const boxes = [...pages.entries()].map(([id, o]) => {
  const g = groups.find((group) => group.id === id);
  return { x: g.x + o.dx, y: g.y + o.dy };
});
assert.ok(
  Math.abs(boxes[0].x - boxes[1].x) >= size.w || Math.abs(boxes[0].y - boxes[1].y) >= size.h,
  'pages do not overlap',
);
assert.equal(placePages(groups, [], 400, 400, size, 1, new Map()).size, 1, 'no more pages than asked');
const kept = placePages(groups, [], 400, 400, size, 7, pages);
assert.deepEqual([...kept.entries()], [...pages.entries()], 'a page keeps its spot while it is free');
const crowded = placePages(groups, [{ x: 0, y: 0, w: 400, h: 400 }], 400, 400, size, 7, new Map());
assert.equal(crowded.size, 0, 'with no room, a stack is a bubble');

// Names go where they clear the pages and one another.
const labels = chooseLabels(
  [
    { name: 'Los Angeles', x: 200, y: 200, population: 3_800_000 },
    { name: 'Alhambra', x: 205, y: 204, population: 80_000 },
    { name: 'Pomona', x: 350, y: 60, population: 150_000 },
  ],
  [{ x: 320, y: 40, w: 80, h: 40 }],
  400,
  400,
  10,
).map((label) => label.name);
assert.deepEqual(labels, ['Los Angeles'], 'a smaller name under a larger, or under a page, is left out');

assert.equal(WORLD, 1000);
console.log('PASS the News near Me map draws the view in world units and lays out every page');
