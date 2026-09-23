/**
 * Builds lib/places-data.json, the gazetteer behind News near Me.
 *
 *   node scripts/build-places.mjs
 *
 * Towns come from GeoNames (cities15000: every place of 15,000 people or
 * more, worldwide; CC BY 4.0, credited wherever the feature shows), U.S.
 * counties from the Census Bureau's 2024 gazetteer, and the outlines of
 * California's 58 counties from the Census Bureau's 1:20,000,000 cartographic
 * boundaries as plotly publishes them in GeoJSON (both public domain). The
 * outlines are what say a reader in Palmdale is in Los Angeles County and how
 * far a reader is from San Bernardino County's edge rather than its middle;
 * the rest of the country, whose counties the Journal rarely names, is
 * measured from each county's centre. Nothing
 * here is fetched at request time: a reader's location is matched against
 * this file on the Journal's own server and goes nowhere else.
 *
 * Downloads are cached in the system temp directory, so a rebuild after the
 * first is offline.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CACHE = join(tmpdir(), 'gcj-places');
const SOURCES = {
  cities: 'https://download.geonames.org/export/dump/cities15000.zip',
  // Every place of 1,000 people or more, of which only California's are
  // kept: its small towns and the neighbourhoods its stories name (Pacific
  // Palisades, Boyle Heights, Mira Mesa), so a story is pinned where it is.
  localCities: 'https://download.geonames.org/export/dump/cities1000.zip',
  admin1: 'https://download.geonames.org/export/dump/admin1CodesASCII.txt',
  countryInfo: 'https://download.geonames.org/export/dump/countryInfo.txt',
  counties:
    'https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_counties_national.zip',
  countyShapes:
    'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json',
  // Natural Earth, public domain: the land and the U.S. states the News near
  // Me map is drawn on, at 1:50,000,000.
  countries:
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson',
  states:
    'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson',
};

// Sections of a city (PPLX), and places that are historical, abandoned or
// destroyed. A reader in Echo Park is near Los Angeles, not near a
// neighbourhood the rest of the paper never names.
const SKIPPED_FEATURES = new Set(['PPLX', 'PPLH', 'PPLQ', 'PPLW', 'PPLCH']);

async function cached(url) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, url.split('/').pop());
  if (!existsSync(file)) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  }
  if (!file.endsWith('.zip')) return readFileSync(file, 'utf8');
  const inner = join(CACHE, url.split('/').pop().replace(/\.zip$/, '.txt'));
  if (!existsSync(inner)) {
    try {
      execFileSync('unzip', ['-oq', file, '-d', CACHE]);
    } catch {
      execFileSync('tar', ['-xf', file, '-C', CACHE]);
    }
  }
  return readFileSync(inner, 'utf8');
}

const rows = (text) =>
  text
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('\t'));

const round = (value) => Math.round(Number(value) * 1e4) / 1e4;

const [
  citiesText,
  admin1Text,
  countriesText,
  countiesText,
  shapesText,
  landText,
  statesText,
  localText,
] =
  await Promise.all([
    cached(SOURCES.cities),
    cached(SOURCES.admin1),
    cached(SOURCES.countryInfo),
    cached(SOURCES.counties),
    cached(SOURCES.countyShapes),
    cached(SOURCES.countries),
    cached(SOURCES.states),
    cached(SOURCES.localCities),
  ]);

const countries = {};
for (const row of rows(countriesText)) countries[row[0]] = row[4];

const cities = [];
const usedRegions = new Set();
for (const row of rows(citiesText)) {
  const [, name, asciiName, , lat, lon, , feature, cc, , admin1, admin2, , , population] = row;
  if (SKIPPED_FEATURES.has(feature)) continue;
  cities.push([
    name,
    asciiName === name ? 0 : asciiName,
    round(lat),
    round(lon),
    cc,
    admin1,
    cc === 'US' ? admin2 : '',
    Number(population) || 0,
  ]);
  usedRegions.add(`${cc}.${admin1}`);
}
cities.sort((a, b) => b[7] - a[7]);

// California's towns under 15,000 and its named neighbourhoods. They are for
// reading where a story is set, never for naming where a reader is: a reader
// in Echo Park is shown stories near Los Angeles.
const larger = new Set(rows(citiesText).map((row) => row[0]));
const localPlaces = [];
for (const row of rows(localText)) {
  const [id, name, asciiName, , lat, lon, , feature, cc, , admin1, admin2, , , population] = row;
  if (cc !== 'US' || admin1 !== 'CA') continue;
  if (feature !== 'PPLX' && (SKIPPED_FEATURES.has(feature) || larger.has(id))) continue;
  localPlaces.push([
    name,
    asciiName === name ? 0 : asciiName,
    round(lat),
    round(lon),
    cc,
    admin1,
    admin2,
    Number(population) || 0,
  ]);
}

const regions = {};
for (const [code, name] of rows(admin1Text)) {
  if (usedRegions.has(code)) regions[code] = name;
}

const counties = [];
for (const row of rows(countiesText).slice(1)) {
  const [usps, geoid, , name, , , landSqMi, , lat, lon] = row.map((cell) => cell.trim());
  counties.push([usps, geoid.slice(2), name, round(lat), round(lon), Math.round(Number(landSqMi))]);
}

// Every ring of every polygon, outer and hole alike, as [lon, lat] to about
// 100 metres: an even-odd test across all of a county's rings is inside/outside.
const countyShapes = {};
for (const feature of JSON.parse(shapesText).features) {
  if (feature.properties.STATE !== '06') continue;
  const { type, coordinates } = feature.geometry;
  const polygons = type === 'Polygon' ? [coordinates] : coordinates;
  countyShapes[`CA.${feature.properties.COUNTY}`] = polygons.flatMap((polygon) =>
    polygon.map((ring) =>
      ring
        .map(([lon, lat]) => [Math.round(lon * 1e3) / 1e3, Math.round(lat * 1e3) / 1e3])
        .filter(([lon, lat], i, all) => i === 0 || lon !== all[i - 1][0] || lat !== all[i - 1][1]),
    ),
  );
}

const data = {
  credit:
    'Place data: GeoNames (geonames.org, CC BY 4.0) and the U.S. Census Bureau.',
  countries,
  regions,
  // [state, county FIPS, name, lat, lon, land square miles]
  counties,
  // "CA.037": rings of [lon, lat]
  countyShapes,
  // [name, ASCII name or 0 when the same, lat, lon, country, region, county FIPS (U.S. only), population]
  cities,
  // The same, for California's small towns and neighbourhoods.
  localPlaces,
};

const out = new URL('../lib/places-data.json', import.meta.url);
writeFileSync(out, JSON.stringify(data));
console.log(
  `lib/places-data.json: ${cities.length} towns, ${localPlaces.length} California places, ${counties.length} counties ` +
    `(${Object.keys(countyShapes).length} outlined), ${Object.keys(regions).length} regions, ` +
    `${Object.keys(countries).length} countries`,
);

// The base map, every ring flattened to whole hundredths of a degree
// [lon, lat, lon, lat, ...]: about a kilometre, finer than the 1:50m source.
const flatRings = (features) =>
  features.flatMap(({ geometry }) => {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    return polygons.flatMap((polygon) =>
      polygon.map((ring) => {
        const flat = [];
        for (const [lon, lat] of ring) {
          const x = Math.round(lon * 100);
          const y = Math.round(lat * 100);
          if (flat.length && flat[flat.length - 2] === x && flat[flat.length - 1] === y) continue;
          flat.push(x, y);
        }
        return flat;
      }),
    );
  }).filter((flat) => flat.length >= 8);

const land = flatRings(JSON.parse(landText).features);
const states = flatRings(
  JSON.parse(statesText).features.filter((feature) => feature.properties.iso_a2 === 'US'),
);
const mapOut = new URL('../lib/map-data.json', import.meta.url);
writeFileSync(
  mapOut,
  JSON.stringify({ credit: 'Map: Natural Earth and the U.S. Census Bureau.', land, states }),
);
console.log(
  `lib/map-data.json: ${land.length} land rings, ${states.length} U.S. state rings, ` +
    `${(land.flat().length + states.flat().length) / 2} points`,
);
