import 'server-only';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import mapData from '@/lib/map-data.json';
import places from '@/lib/places-data.json';
import type { Gazetteer } from '@/lib/near-me';
import { readRelief, type BaseMap, type Relief } from '@/lib/near-me-map';

/**
 * The gazetteer, the base map and its shaded relief, loaded once per server
 * instance for the two News near Me routes: the one that finds the stories
 * and the one that draws more of the map as the reader moves it.
 */
export const gazetteer = places as unknown as Gazetteer;
export const baseMap = mapData as unknown as BaseMap;

let reliefFile: Relief | null | undefined;

/**
 * The shaded relief (lib/relief.bin, which next.config.ts adds to both
 * routes' files). A map without it is still a map, so a missing or damaged
 * file is left out rather than failing the reader's request.
 */
export function relief(): Relief | undefined {
  if (reliefFile === undefined) {
    try {
      reliefFile = readRelief(readFileSync(join(process.cwd(), 'lib', 'relief.bin')));
    } catch (error) {
      console.error('News near Me: no shaded relief', error);
      reliefFile = null;
    }
  }
  return reliefFile ?? undefined;
}

export const NO_STORE = { 'cache-control': 'private, no-store' } as const;

/** Towns for the map's labels: [name, lat, lon, population], largest first. */
export const labelTowns: [string, number, number, number][] = gazetteer.cities.map(
  (row) => [row[0], row[2], row[3], row[7]],
);
