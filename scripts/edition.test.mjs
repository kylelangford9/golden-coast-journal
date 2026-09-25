import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  JOURNAL_PHOTO_ORIGIN,
  PHOTO_CACHE_CONTROL,
  buildEdition,
  journalMediaUrl,
  journalPhotoSource,
} from '../lib/edition.ts';

/**
 * The edition: the newsroom laying out today's paper once, for every site
 * that carries it. The failure this exists to prevent is a consumer showing an
 * empty box because it disagreed with the newsroom about where photographs
 * live, so the photograph rules are tested hardest.
 */

const SITE = 'https://www.goldencoastjournal.com';
const NOW = Date.parse('2026-09-25T20:00:00Z');
const photo = (name) => `${JOURNAL_PHOTO_ORIGIN}/editorial/${name}.jpg`;

let minute = 0;
const story = (slug, section, extra = {}) => ({
  id: slug,
  slug,
  section,
  title: `Headline for ${slug}`,
  dek: `Dek for ${slug}`,
  body: ['Body text that must never leave the newsroom.'],
  keyPoints: [],
  author: 'Kyle Langford',
  publishedAt: new Date(NOW - 60_000 * ++minute).toISOString(),
  updatedAt: new Date(NOW).toISOString(),
  readingMinutes: 2,
  imageUrl: photo(slug),
  imageAlt: `A photograph for ${slug}`,
  imageCredit: 'Journal file photo',
  sources: [{ label: 'Source', url: 'https://example.gov' }],
  status: 'published',
  featured: false,
  ...extra,
});

// Photographs: the Journal's bucket becomes the Journal's domain, and nothing
// else is ever handed out.
assert.equal(
  journalMediaUrl(photo('ca-state-capitol'), SITE),
  `${SITE}/media/photos/editorial/ca-state-capitol.jpg`,
);
assert.equal(journalMediaUrl(`${SITE}/media/photos/editorial/a.jpg`, SITE), `${SITE}/media/photos/editorial/a.jpg`);
assert.equal(journalMediaUrl('https://upload.wikimedia.org/x.jpg', SITE), null, 'foreign hosts are dropped, not passed through');
assert.equal(journalMediaUrl(`${JOURNAL_PHOTO_ORIGIN}/../secret/x.jpg`, SITE), null, 'no climbing out of the bucket');
assert.equal(journalMediaUrl(`${JOURNAL_PHOTO_ORIGIN}/`, SITE), null);
assert.equal(journalMediaUrl('', SITE), null);
assert.equal(journalMediaUrl('not a url at all', SITE), null);

// A normal day's paper.
minute = 0;
const day = [
  story('newest-california', 'California'),
  story('featured-cover', 'California', { featured: true }),
  story('climate-lead', 'Climate'),
  story('tech-brief', 'Technology'),
  story('california-2', 'California'),
  story('climate-2', 'Climate'),
  story('california-3', 'California'),
  story('california-4', 'California'),
  story('nation-1', 'Nation'),
  story('world-1', 'World'),
  story('scheduled', 'California', { publishedAt: new Date(NOW + 3_600_000).toISOString() }),
  story('draft', 'California', { status: 'draft' }),
];
const edition = buildEdition(day, { origin: SITE, now: NOW });

assert.equal(edition.version, 1);
assert.equal(edition.date, '2026-09-25');
assert.equal(edition.front.cover.slug, 'featured-cover', 'the cover is the newest featured story with a photograph');
assert.equal(edition.front.cover.url, `${SITE}/article/featured-cover`);
assert.equal(edition.front.cover.image.url, `${SITE}/media/photos/editorial/featured-cover.jpg`);
assert.deepEqual(
  edition.front.briefs.map((s) => s.slug),
  ['newest-california', 'climate-lead'],
  'front briefs are the newest stories, from two different sections',
);
assert.equal(edition.inside[0].section, 'Technology', "page 2 is the freshest section that is neither the cover's nor California's");
assert.equal(edition.inside[1].title, 'Around the state');
assert.equal(edition.inside[1].section, 'California');
assert.ok(edition.inside[1].briefs.length <= 2);

const slots = [
  edition.front.cover,
  ...edition.front.briefs,
  ...edition.inside.flatMap((page) => [page.lead, ...page.briefs]),
  ...edition.back.briefs,
];
const slugs = slots.map((s) => s.slug);
assert.equal(new Set(slugs).size, slugs.length, 'no story is printed twice');
assert.ok(!slugs.includes('scheduled'), 'nothing scheduled for later');
assert.ok(!slugs.includes('draft'), 'no drafts');
for (const slot of slots) {
  assert.deepEqual(
    Object.keys(slot).sort(),
    ['byline', 'dek', 'headline', 'image', 'publishedAt', 'readingMinutes', 'section', 'slug', 'url'],
    'headline fields only: no body, sources or status leave the newsroom',
  );
  if (slot.image) assert.ok(slot.image.url.startsWith(`${SITE}/media/photos/`), 'every photograph is on the Journal domain');
}
assert.ok(!JSON.stringify(edition).includes('Body text'), 'bodies stay home');

// The September 2026 failure: no story has a photograph a consumer accepts.
// The paper still prints, with the newest featured story leading without one.
minute = 0;
const noPhotos = [
  story('lead-without-photo', 'California', { featured: true, imageUrl: 'https://elsewhere.example/a.jpg' }),
  story('second', 'Climate', { imageUrl: '' }),
];
const bare = buildEdition(noPhotos, { origin: SITE, now: NOW });
assert.equal(bare.front.cover.slug, 'lead-without-photo');
assert.equal(bare.front.cover.image, null);
assert.equal(bare.front.briefs.length, 1);

// A photograph beats featured-without-one, so the front page has a picture.
minute = 0;
const mixed = buildEdition(
  [
    story('featured-no-photo', 'California', { featured: true, imageUrl: '' }),
    story('plain-with-photo', 'Climate'),
  ],
  { origin: SITE, now: NOW },
);
assert.equal(mixed.front.cover.slug, 'plain-with-photo');

// A thin news day still makes a paper; an empty one makes none.
minute = 0;
const one = buildEdition([story('only', 'Climate')], { origin: SITE, now: NOW });
assert.equal(one.front.cover.slug, 'only');
assert.deepEqual(one.front.briefs, []);
assert.deepEqual(one.inside, []);
assert.equal(buildEdition([], { origin: SITE, now: NOW }), null);
assert.equal(buildEdition([story('future', 'California', { publishedAt: new Date(NOW + 1).toISOString() })], { origin: SITE, now: NOW }), null);

// California's date, not UTC's: 8pm on the 25th in Los Angeles is the 26th in UTC.
const evening = Date.parse('2026-09-26T03:00:00Z');
minute = 0;
assert.equal(buildEdition([story('late', 'California', { publishedAt: '2026-09-26T02:00:00Z' })], { origin: SITE, now: evening }).date, '2026-09-25');

// The /media/photos route serves only plain photo paths, and the edition only
// hands out paths the route will serve.
assert.equal(journalPhotoSource(['editorial', 'ca-power-lines.jpg']), `${JOURNAL_PHOTO_ORIGIN}/editorial/ca-power-lines.jpg`);
assert.equal(journalPhotoSource([]), null);
assert.equal(journalPhotoSource(['..', 'secret.jpg']), null);
assert.equal(journalPhotoSource(['editorial', '.hidden']), null);
assert.equal(journalPhotoSource(['editorial', 'a..b.jpg']), null);
assert.equal(journalPhotoSource(['editorial', 'a%2Fb.jpg']), null, 'no encoded slashes');
assert.equal(journalPhotoSource(['a', 'b', 'c', 'd', 'e.jpg']), null, 'at most four levels');
assert.equal(journalMediaUrl(`${JOURNAL_PHOTO_ORIGIN}/editorial/odd name.jpg`, SITE), null, 'never hand out an address the route refuses');

// Caching, fixed at both ends: new uploads carry a lifetime, and the route
// sets one for every photo already in storage (which all answer no-cache).
const intake = readFileSync('lib/asset-intake.ts', 'utf8');
assert.match(intake, /'cache-control': 'max-age=\d+'/, 'the intake uploads with a cache lifetime');
const route = readFileSync('app/media/photos/[...path]/route.ts', 'utf8');
assert.ok(route.includes("'cache-control': PHOTO_CACHE_CONTROL"), 'the media route sets its own caching');
assert.ok(route.includes("type.startsWith('image/')"), 'the media route serves images only');
assert.match(PHOTO_CACHE_CONTROL, /s-maxage=3600/, 'corrections reach readers within the hour');
const config = readFileSync('next.config.ts', 'utf8');
assert.ok(!/source:\s*[`'"]\/media/.test(config), 'no rewrite or header rule shadows the media route');

console.log('PASS the edition lays out one paper for everyone, with Journal-domain photographs and nothing unpublished');
