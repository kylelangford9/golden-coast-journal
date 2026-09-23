import { NextResponse } from 'next/server';
import type { Article } from '@/lib/content';
import {
  BROAD_MILES,
  NEAR_MILES,
  distanceLabel,
  milesBetween,
  nearestTown,
  storiesNear,
  type NearHit,
} from '@/lib/near-me';
import { NO_STORE, baseMap, gazetteer, labelTowns, relief } from '@/lib/near-me-data';
import {
  drawRegion,
  frameView,
  projectionFor,
  toWorld,
  widen,
  worldMiles,
} from '@/lib/near-me-map';
import { listPublished } from '@/lib/repository';

// The browser sends two decimal places, about a kilometer; so is anything
// that sends more.
const round = (value: number) => Math.round(value * 100) / 100;

// With nothing near, the first view takes in the closest coverage out to
// this multiple of the nearest story's distance. Everything else is still on
// the map, a pan or a pinch away.
const CLOSEST_IN_VIEW = 2.5;

// Room at the map's edges for the mini front pages drawn beside each place.
const PAPER_ROOM = 0.26;

// The first view holds this many of the nearest stories, and at least this
// many miles round the reader.
const FIRST_VIEW = 5;
const FIRST_VIEW_MILES = 10;

// The map is drawn this far past each edge of the view, so a pan shows land
// straight away while the browser asks for more.
const AHEAD = 0.5;

// A front page's standfirst: enough to say what the story is, cut at a word.
const excerpt = (text: string, length = 140) => {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= length) return clean;
  return `${clean.slice(0, clean.lastIndexOf(' ', length)).replace(/[,;:.]$/, '')}…`;
};

const clampNumber = (value: unknown, min: number, max: number, fallback: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;

/**
 * News near Me. The reader's position arrives in the body of a POST, never
 * in a URL, so it is in no request log. It is rounded, matched to a town in
 * the Journal's own gazetteer, used to choose the stories and draw the map
 * for this one response, and neither stored nor logged; no geocoding or
 * mapping service ever sees it.
 *
 * Every story the Journal can place is sent, not only the near ones, so the
 * reader can move the map anywhere and find what was reported there.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid();
  }
  const { lat, lon, aspect, pixels } = (body && typeof body === 'object' ? body : {}) as {
    lat?: unknown;
    lon?: unknown;
    aspect?: unknown;
    pixels?: unknown;
  };
  if (typeof lat !== 'number' || typeof lon !== 'number') return invalid();
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return invalid();
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return invalid();
  // The map's shape, width over height, and its width on screen.
  const shape = clampNumber(aspect, 0.6, 2.2, 1.5);
  const width = clampNumber(pixels, 200, 2400, 600);

  const reader = nearestTown(gazetteer, round(lat), round(lon));
  const result = storiesNear(gazetteer, reader, await listPublished(200));

  const inUS = reader.countryCode === 'US';
  const area = inUS ? reader.region || reader.country : reader.country;
  const card = ({ story, where }: NearHit<Article>, showWhere = true) => ({
    slug: story.slug,
    title: story.title,
    section: story.section,
    imageUrl: story.imageUrl,
    dek: excerpt(story.dek),
    where: showWhere ? where : story.section,
  });

  // A region the reader stands in ("Southern California" for a reader in
  // South El Monte) has no one spot to put a story; set at its middle, the
  // story would look to be somewhere it is not. Those are listed under the
  // map. From far off, as for a reader in Denver, the region is a fair place.
  const inBroadRegion = (hit: NearHit<Article>) =>
    !!hit.place &&
    hit.place.radiusMi >= BROAD_MILES &&
    milesBetween(reader.lat, reader.lon, hit.place.lat, hit.place.lon) < 2 * hit.place.radiusMi;

  const projection = projectionFor(reader);
  const onMap = result.located.filter((hit) => !inBroadRegion(hit));
  // The first view is close in, as a map app's search near you is: the
  // reader and the handful of stories nearest them, spread out enough to
  // read. The rest are a pan or a pinch away.
  const farthest = (result.closest[0]?.miles ?? 0) * CLOSEST_IN_VIEW;
  const framed = result.near.length
    ? onMap.filter((hit) => (hit.miles ?? Infinity) <= NEAR_MILES).slice(0, FIRST_VIEW)
    : onMap.filter((hit) => (hit.miles ?? Infinity) <= farthest).slice(0, FIRST_VIEW);
  const view = frameView(
    projection,
    reader,
    framed.flatMap((hit) => (hit.place ? [hit.place] : [])),
    FIRST_VIEW_MILES,
    shape,
    PAPER_ROOM,
  );
  const highlight = [
    ...new Set(framed.flatMap((hit) => (hit.place?.countyKey ? [hit.place.countyKey] : []))),
  ];
  const geometry = drawRegion(
    baseMap,
    projection,
    widen(view, AHEAD),
    Math.max(0.5, (view.w / width) * 0.8),
    highlight,
    labelTowns,
    relief(),
  );

  const stories = onMap.map((hit) => {
    const at = toWorld(projection, hit.place!.lat, hit.place!.lon);
    return {
      x: Math.round(at.x),
      y: Math.round(at.y),
      place: hit.place!.name,
      distance:
        (hit.miles ?? 0) >= 1 ? distanceLabel(hit.miles ?? 0, reader.countryCode) : null,
      near: (hit.miles ?? Infinity) <= NEAR_MILES,
      story: card(hit),
    };
  });
  const mapped = new Set(stories.map((item) => item.story.slug));
  const you = toWorld(projection, reader.lat, reader.lon);

  const more = [
    {
      heading: `Also near ${reader.town}`,
      stories: result.located.filter(inBroadRegion).map((hit) => card(hit)),
    },
    {
      heading: inUS && reader.regionCode !== 'US.DC' ? `Across ${area}` : `In ${area}`,
      stories: result.region
        .filter((hit) => !mapped.has(hit.story.slug))
        .map((hit) => card(hit, false)),
    },
  ].filter((group) => group.stories.length);

  return NextResponse.json(
    {
      town: reader.town,
      radius: distanceLabel(NEAR_MILES, reader.countryCode)
        .replace(/ mi$/, ' miles')
        .replace(/ km$/, ' kilometers'),
      hasNear: result.near.length > 0,
      projection,
      view,
      you: { x: Math.round(you.x), y: Math.round(you.y) },
      ring: Math.round(worldMiles(NEAR_MILES)),
      highlight,
      geometry,
      stories,
      more,
      credit: `${gazetteer.credit} ${baseMap.credit}`,
    },
    { headers: NO_STORE },
  );
}

function invalid() {
  return NextResponse.json(
    { error: 'Send { "lat": number, "lon": number }.' },
    { status: 400, headers: NO_STORE },
  );
}
