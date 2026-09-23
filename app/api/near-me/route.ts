import { NextResponse } from 'next/server';
import type { Article } from '@/lib/content';
import places from '@/lib/places-data.json';
import {
  NEAR_MILES,
  distanceLabel,
  nearestTown,
  storiesNear,
  type Gazetteer,
  type NearHit,
} from '@/lib/near-me';
import { listPublished } from '@/lib/repository';

const gazetteer = places as unknown as Gazetteer;

// The browser sends two decimal places, about a kilometer; so is anything
// that sends more.
const round = (value: number) => Math.round(value * 100) / 100;

/**
 * News near Me. The reader's position arrives in the body of a POST, never
 * in a URL, so it is in no request log. It is rounded, matched to a town in
 * the Journal's own gazetteer, used for this one response, and neither stored
 * nor logged; no geocoding service ever sees it.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid();
  }
  const { lat, lon } = (body && typeof body === 'object' ? body : {}) as {
    lat?: unknown;
    lon?: unknown;
  };
  if (typeof lat !== 'number' || typeof lon !== 'number') return invalid();
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return invalid();
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return invalid();

  const reader = nearestTown(gazetteer, round(lat), round(lon));
  const result = storiesNear(gazetteer, reader, await listPublished(200));

  const inUS = reader.countryCode === 'US';
  const area = inUS ? reader.region || reader.country : reader.country;
  const card = ({ story, where }: NearHit<Article>, showWhere = true) => ({
    slug: story.slug,
    title: story.title,
    section: story.section,
    imageUrl: story.imageUrl,
    imageAlt: story.imageAlt,
    where: showWhere ? where : story.section,
  });

  return NextResponse.json(
    {
      town: reader.town,
      radius: distanceLabel(NEAR_MILES, reader.countryCode)
        .replace(/ mi$/, ' miles')
        .replace(/ km$/, ' kilometers'),
      groups: [
        { id: 'near', heading: `Near ${reader.town}`, stories: result.near.map((hit) => card(hit)) },
        {
          id: 'region',
          heading:
            inUS && reader.regionCode !== 'US.DC' ? `Across ${area}` : `In ${area}`,
          stories: result.region.map((hit) => card(hit, false)),
        },
        {
          id: 'closest',
          heading: 'The Journal’s closest coverage',
          stories: result.closest.map((hit) => card(hit)),
        },
      ].filter((group) => group.stories.length),
      hasNear: result.near.length > 0,
      credit: gazetteer.credit,
    },
    { headers: { 'cache-control': 'private, no-store' } },
  );
}

function invalid() {
  return NextResponse.json(
    { error: 'Send { "lat": number, "lon": number }.' },
    { status: 400, headers: { 'cache-control': 'private, no-store' } },
  );
}
