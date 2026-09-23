import 'server-only';
import mapData from '@/lib/map-data.json';
import places from '@/lib/places-data.json';
import type { Gazetteer } from '@/lib/near-me';
import type { BaseMap, CountyShapes } from '@/lib/near-me-map';

/**
 * The gazetteer and the base map, loaded once per server instance for the
 * two News near Me routes: the one that finds the stories and the one that
 * draws more of the map as the reader moves it.
 */
export const gazetteer = places as unknown as Gazetteer;
export const baseMap = mapData as unknown as BaseMap;
export const countyShapes = gazetteer.countyShapes as CountyShapes | undefined;

export const NO_STORE = { 'cache-control': 'private, no-store' } as const;

/** Towns for the map's labels: [name, lat, lon, population], largest first. */
export const labelTowns: [string, number, number, number][] = gazetteer.cities.map(
  (row) => [row[0], row[2], row[3], row[7]],
);
