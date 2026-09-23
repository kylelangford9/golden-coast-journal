/**
 * Builds the News near Me base map:
 *
 *   node scripts/build-map.mjs            lib/map-data.json and lib/relief.bin
 *   node scripts/build-map.mjs --vector   lib/map-data.json only
 *
 * lib/map-data.json holds every layer the server draws for a view, as rings
 * and lines it clips and simplifies to the detail that view needs: the land
 * and its borders, water, built-up areas, parks and forests, airports and
 * roads, and the names of the places a map names besides towns (oceans, bays,
 * lakes, parks, states and countries). lib/relief.bin is the shaded relief,
 * cut into small images the server sends with the view.
 *
 * Sources, all public domain unless noted:
 *  - Natural Earth (naturalearthdata.com): the world's land, borders, lakes
 *    and rivers, at 1:50m for whole continents and 1:10m closer in.
 *  - The U.S. Census Bureau: the states' and counties' 1:500,000
 *    cartographic boundaries, which follow the shoreline, and its 2020 urban
 *    areas; and from TIGER/Line 2024, primary and secondary roads, park,
 *    forest and airport outlines, and lakes, reservoirs, bays and rivers.
 *  - Shaded relief from the Terrain Tiles on the Registry of Open Data on
 *    AWS (Mapzen/Linux Foundation; SRTM, USGS 3DEP/NED, GMTED2010 and
 *    ETOPO1, credited on the privacy page and under the map).
 *
 * Downloads are cached in the system temp directory, so a rebuild after the
 * first is offline.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { readShapefile } from './shapefile.mjs';

const CACHE = join(tmpdir(), 'gcj-map');
const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';
const CB = 'https://www2.census.gov/geo/tiger/GENZ2024/shp';
const TIGER = 'https://www2.census.gov/geo/tiger/TIGER2024';

// Water outside California is Natural Earth's; inside it, and in the
// counties across its borders that share its lakes and rivers (Tahoe, Mead,
// Havasu, the Colorado, Upper Klamath Lake), it is the Census Bureau's.
const WATER_COUNTIES = [
  ...Array.from({ length: 58 }, (_, i) => `06${String(i * 2 + 1).padStart(3, '0')}`),
  '32003', '32005', '32009', '32019', '32021', '32023', '32031', '32510',
  '04012', '04015', '04027',
  '41015', '41029', '41033', '41035', '41037',
];

mkdirSync(CACHE, { recursive: true });

// A file's name in the cache: its own, or for a terrain tile (…/z/x/y.png)
// all three numbers.
const cacheName = (url) =>
  url.includes('/terrarium/') ? `terrarium-${url.split('/').slice(-3).join('-')}` : basename(url);

async function download(url, attempts = 6) {
  const file = join(CACHE, cacheName(url));
  if (existsSync(file)) return file;
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url} returned ${response.status}`);
      const body = Buffer.from(await response.arrayBuffer());
      // The Census Bureau's servers answer a burst of requests with a
      // "Request Rejected" page and a 200; a zip starts "PK".
      if (url.endsWith('.zip') && body.toString('latin1', 0, 2) !== 'PK') {
        throw new Error(`${url} did not return a zip`);
      }
      if (url.endsWith('.png') && body.toString('latin1', 1, 4) !== 'PNG') {
        throw new Error(`${url} did not return a PNG`);
      }
      writeFileSync(file, body);
      return file;
    } catch (error) {
      if (attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
}

async function shapefile(url, fallback) {
  let zip;
  try {
    zip = await download(url, fallback ? 3 : 6);
  } catch (error) {
    if (!fallback) throw error;
    console.log(`  ${basename(url)} refused; using ${basename(fallback)}`);
    return shapefile(fallback);
  }
  const dir = zip.replace(/\.zip$/, '');
  const base = join(dir, basename(dir));
  if (!existsSync(`${base}.shp`)) {
    mkdirSync(dir, { recursive: true });
    try {
      execFileSync('unzip', ['-oq', zip, '-d', dir]);
    } catch {
      // Relative paths: Windows tar reads "C:" as a remote host.
      execFileSync('tar', ['-xf', basename(zip), '-C', basename(dir)], { cwd: CACHE });
    }
  }
  return readShapefile(base);
}

const geojson = async (url) => JSON.parse(readFileSync(await download(url), 'utf8')).features;

/** Runs `task` over `items`, `limit` at a time. */
async function pool(items, limit, task) {
  const out = Array.from({ length: items.length });
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const index = next;
        next += 1;
        out[index] = await task(items[index], index);
      }
    }),
  );
  return out;
}

// ---------------------------------------------------------------------------
// Geometry, in degrees.

const same = (a, b) => a[0] === b[0] && a[1] === b[1];

/** Twice the signed area: positive when the ring runs anticlockwise. */
function signedArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return sum;
}

/** A ring turned to run anticlockwise (an outline) or clockwise (a hole). */
function orient(ring, anticlockwise) {
  return signedArea(ring) > 0 === anticlockwise ? ring : [...ring].reverse();
}

/**
 * Every ring of a GeoJSON polygon or multipolygon, outlines anticlockwise
 * and holes clockwise, so the server can fill a layer with the nonzero rule
 * and two overlapping shapes never cancel each other out.
 */
function geojsonRings(geometry) {
  if (!geometry) return [];
  const polygons =
    geometry.type === 'Polygon'
      ? [geometry.coordinates]
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates
        : [];
  return polygons.flatMap((polygon) => polygon.map((ring, i) => orient(ring, i === 0)));
}

function geojsonLines(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  return [];
}

// A shapefile's outlines run clockwise and its holes anticlockwise: the
// opposite of GeoJSON, so every ring is turned round.
const shapeRings = (record) => record.parts.map((ring) => [...ring].reverse());

/** Douglas–Peucker, for a line or a ring, `tolerance` in degrees of latitude. */
function simplify(points, tolerance) {
  if (points.length < 4 || tolerance <= 0) return points;
  const cos = Math.cos((points[0][1] * Math.PI) / 180);
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  const tol2 = tolerance * tolerance;
  while (stack.length) {
    const [from, to] = stack.pop();
    const ax = points[from][0] * cos;
    const ay = points[from][1];
    const dx = points[to][0] * cos - ax;
    const dy = points[to][1] - ay;
    const length2 = dx * dx + dy * dy;
    let worst = -1;
    let worstDistance = tol2;
    for (let i = from + 1; i < to; i += 1) {
      const px = points[i][0] * cos;
      const py = points[i][1];
      const t = length2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / length2)) : 0;
      const ex = ax + t * dx - px;
      const ey = ay + t * dy - py;
      const distance = ex * ex + ey * ey;
      if (distance > worstDistance) {
        worstDistance = distance;
        worst = i;
      }
    }
    if (worst > 0) {
      keep[worst] = 1;
      stack.push([from, worst], [worst, to]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/**
 * A layer's rings or lines in whole units of 1/`scale` degree, each point
 * after the first a step from the one before, packed as the server's
 * lib/near-me-map.ts `unpack` reads them: for each shape its number of
 * points, then its first point and its steps, every number zigzagged (0, -1,
 * 1, -2, ... as 0, 1, 2, 3, ...) and written seven bits to a byte, in base64.
 * Steps are short, so most take a byte: a third of the size of JSON arrays.
 */
function pack(shapes) {
  const bytes = [];
  const put = (value) => {
    let n = value < 0 ? -2 * value - 1 : 2 * value;
    while (n >= 0x80) {
      bytes.push((n % 0x80) | 0x80);
      n = Math.floor(n / 0x80);
    }
    bytes.push(n);
  };
  for (const flat of shapes) {
    put(flat.length / 2);
    for (const value of flat) put(value);
  }
  return Buffer.from(bytes).toString('base64');
}

function encode(shapes, scale, tolerance, closed) {
  const out = [];
  for (const shape of shapes) {
    const simple = simplify(shape, tolerance);
    const flat = [];
    let px = 0;
    let py = 0;
    for (const [lon, lat] of simple) {
      const x = Math.round(lon * scale);
      const y = Math.round(lat * scale);
      if (flat.length && x === px && y === py) continue;
      flat.push(flat.length ? x - px : x, flat.length ? y - py : y);
      px = x;
      py = y;
    }
    if (flat.length >= (closed ? 8 : 4)) out.push(flat);
  }
  return out;
}

const pointKey = (p) => `${p[0]},${p[1]}`;

/**
 * Neighbouring shapes that share their edges, as the Census Bureau's states
 * and counties do, merged: the outline of the whole (the coast and the
 * border with the world beyond) as rings, and the edges they shared (the
 * lines between them) as lines. Every ring must run the same way round, so a
 * shared edge is walked once in each direction.
 */
function dissolve(rings) {
  const edges = [];
  const directed = new Set();
  for (const ring of rings) {
    const n = same(ring[0], ring[ring.length - 1]) ? ring.length - 1 : ring.length;
    for (let i = 0; i < n; i += 1) {
      const a = ring[i];
      const b = ring[(i + 1) % n];
      if (same(a, b)) continue;
      edges.push([a, b]);
      directed.add(`${pointKey(a)}>${pointKey(b)}`);
    }
  }
  const outward = new Map();
  const shared = [];
  for (const [a, b] of edges) {
    if (directed.has(`${pointKey(b)}>${pointKey(a)}`)) {
      if (pointKey(a) < pointKey(b)) shared.push([a, b]);
    } else {
      const key = pointKey(a);
      if (!outward.has(key)) outward.set(key, []);
      outward.get(key).push(b);
    }
  }
  const outline = [];
  for (const [startKey, ends] of outward) {
    while (ends.length) {
      const start = startKey.split(',').map(Number);
      const ring = [start];
      let at = ends.pop();
      while (pointKey(at) !== startKey) {
        ring.push(at);
        const onward = outward.get(pointKey(at));
        if (!onward?.length) break;
        at = onward.pop();
      }
      ring.push(start);
      if (ring.length >= 4) outline.push(ring);
    }
  }
  return { outline, shared: chain(shared) };
}

/** Segments joined end to end into as few lines as they make. */
function chain(segments) {
  const ends = new Map();
  const add = (key, index) => {
    if (!ends.has(key)) ends.set(key, []);
    ends.get(key).push(index);
  };
  segments.forEach(([a, b], index) => {
    add(pointKey(a), index);
    add(pointKey(b), index);
  });
  const used = new Uint8Array(segments.length);
  const walk = (point, line) => {
    for (;;) {
      const next = (ends.get(pointKey(point)) || []).find((index) => !used[index]);
      if (next === undefined) return;
      used[next] = 1;
      const [a, b] = segments[next];
      point = same(a, point) ? b : a;
      line.push(point);
    }
  };
  const lines = [];
  // Lines start at their ends (where other than two segments meet), then
  // whatever is left is a loop.
  const order = [...segments.keys()].sort(
    (i, j) =>
      Number(ends.get(pointKey(segments[j][0])).length !== 2) -
      Number(ends.get(pointKey(segments[i][0])).length !== 2),
  );
  for (const index of order) {
    if (used[index]) continue;
    used[index] = 1;
    const [a, b] = segments[index];
    const line = [a, b];
    walk(b, line);
    const back = [];
    walk(a, back);
    lines.push([...back.reverse(), ...line]);
  }
  return lines;
}

/** Even–odd point in polygon, across every ring given. */
function inside(point, rings) {
  const [x, y] = point;
  let hit = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
  }
  return hit;
}

function bbox(rings) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const ring of rings) {
    for (const [x, y] of ring) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  return [x0, y0, x1, y1];
}

/**
 * Where a name fits best inside a shape: the point farthest from its edges,
 * found on a grid and then a finer one round the best cell (a lighter
 * version of Mapbox's polylabel). A lake's name goes in the lake, not on the
 * shore its centre may fall on.
 */
function labelPoint(rings) {
  const [x0, y0, x1, y1] = bbox(rings);
  const cos = Math.cos((((y0 + y1) / 2) * Math.PI) / 180);
  const clearance = (x, y) => {
    let best = Infinity;
    for (const ring of rings) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
        const ax = ring[j][0] * cos;
        const ay = ring[j][1];
        const dx = ring[i][0] * cos - ax;
        const dy = ring[i][1] - ay;
        const length2 = dx * dx + dy * dy;
        const t = length2
          ? Math.max(0, Math.min(1, ((x * cos - ax) * dx + (y - ay) * dy) / length2))
          : 0;
        best = Math.min(best, Math.hypot(ax + t * dx - x * cos, ay + t * dy - y));
      }
    }
    return best;
  };
  let best = null;
  let cx = (x0 + x1) / 2;
  let cy = (y0 + y1) / 2;
  let w = x1 - x0;
  let h = y1 - y0;
  for (let pass = 0; pass < 3; pass += 1) {
    const steps = 14;
    for (let i = 0; i <= steps; i += 1) {
      for (let j = 0; j <= steps; j += 1) {
        const x = cx - w / 2 + (w * i) / steps;
        const y = cy - h / 2 + (h * j) / steps;
        if (!inside([x, y], rings)) continue;
        const d = clearance(x, y);
        if (!best || d > best.d) best = { x, y, d };
      }
    }
    if (!best) return null;
    cx = best.x;
    cy = best.y;
    w /= 5;
    h /= 5;
  }
  return best;
}

/** Square kilometres inside a set of rings (outlines less holes). */
function areaKm2(rings) {
  let sum = 0;
  for (const ring of rings) {
    const cos = Math.cos((ring[0][1] * Math.PI) / 180);
    sum += (signedArea(ring) / 2) * cos * 111.32 * 110.57;
  }
  return Math.abs(sum);
}

// TIGER's names are abbreviated for a gazetteer; a map spells them out.
const spell = (name) =>
  name
    .replace(/\bNatl\b/g, 'National')
    .replace(/\bPk\b/g, 'Park')
    .replace(/\bRec\b/g, 'Recreation')
    .replace(/\bRes\b/g, 'Reservoir')
    .replace(/\bMtn\b/g, 'Mountain')
    .replace(/\bMtns\b/g, 'Mountains')
    .replace(/\bIs\b/g, 'Island')
    .replace(/\bIss\b/g, 'Islands')
    .replace(/\bHbr\b/g, 'Harbor')
    .replace(/\bCrk\b/g, 'Creek')
    .replace(/\bLk\b/g, 'Lake')
    .replace(/\bSt\b/g, 'State')
    .replace(/\bMon\b/g, 'Monument')
    .replace(/\bWldns\b/g, 'Wilderness')
    .replace(/\bPres\b/g, 'Preserve')
    .replace(/\bPrsv\b/g, 'Preserve')
    // Angeles National Forest is "Forrest" on one of its parts.
    .replace(/\bForrest\b/g, 'Forest');

// ---------------------------------------------------------------------------
// Sources.

console.log('Downloading (cached in', CACHE, ')…');
const [
  countries50,
  borders50Features,
  admin1Lines50,
  countries10,
  borders10Features,
  lakes10,
  lakesNA,
  rivers10,
  riversNA,
  statesCB,
  countiesCB,
  urbanCB,
  primaryRoads,
  caRoads,
  landmarks,
] = await Promise.all([
  geojson(`${NE}/ne_50m_admin_0_countries.geojson`),
  geojson(`${NE}/ne_50m_admin_0_boundary_lines_land.geojson`),
  geojson(`${NE}/ne_50m_admin_1_states_provinces_lines.geojson`),
  geojson(`${NE}/ne_10m_admin_0_countries.geojson`),
  geojson(`${NE}/ne_10m_admin_0_boundary_lines_land.geojson`),
  geojson(`${NE}/ne_10m_lakes.geojson`),
  geojson(`${NE}/ne_10m_lakes_north_america.geojson`),
  geojson(`${NE}/ne_10m_rivers_lake_centerlines.geojson`),
  geojson(`${NE}/ne_10m_rivers_north_america.geojson`),
  shapefile(`${CB}/cb_2024_us_state_500k.zip`),
  shapefile(`${CB}/cb_2024_us_county_500k.zip`),
  shapefile('https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_us_ua20_corrected_500k.zip'),
  shapefile(`${TIGER}/PRIMARYROADS/tl_2024_us_primaryroads.zip`),
  shapefile(`${TIGER}/PRISECROADS/tl_2024_06_prisecroads.zip`),
  shapefile(`${TIGER}/AREALM/tl_2024_06_arealm.zip`),
]);
const areaWater = (
  await pool(WATER_COUNTIES, 2, (fips) =>
    // The Census Bureau's firewall turns away one or two of 2024's files
    // every time; the year before's water is the same water.
    shapefile(
      `${TIGER}/AREAWATER/tl_2024_${fips}_areawater.zip`,
      `https://www2.census.gov/geo/tiger/TIGER2023/AREAWATER/tl_2023_${fips}_areawater.zip`,
    ),
  )
).flat();

// ---------------------------------------------------------------------------
// The land. Whole continents are drawn from Natural Earth's 1:50m countries,
// as before; closer in, the United States is the Census Bureau's states run
// together (their shared edges become the state lines, the rest the coast)
// and the rest of the world Natural Earth's 1:10m countries.

// The 50 states and D.C.; Puerto Rico and the island territories are Natural Earth’s.
const STATES = statesCB.filter((record) => Number(record.props.STATEFP) <= 56);
const usRings = STATES.flatMap(shapeRings);
const us = dissolve(usRings);
const abroad = countries10
  .filter((feature) => feature.properties.ADM0_A3 !== 'USA')
  .flatMap((feature) => geojsonRings(feature.geometry));

// California's counties: their shared edges are its county lines, and each
// county's own outline is what a reader's county is highlighted with.
const caCounties = countiesCB.filter((record) => record.props.STATEFP === '06');
const caCountyLines = dissolve(caCounties.flatMap(shapeRings)).shared;

// Water, inside California and across its borders from the Census Bureau;
// Natural Earth's lakes elsewhere. A lake wholly or partly inside the area
// the Census water covers is left to the Census.
const censusWaterArea = countiesCB
  .filter((record) => WATER_COUNTIES.includes(record.props.STATEFP + record.props.COUNTYFP))
  .flatMap(shapeRings);
const [wx0, wy0, wx1, wy1] = bbox(censusWaterArea);
const coveredByCensus = (rings) =>
  rings.some((ring) =>
    ring.some(
      (p, i) =>
        i % 4 === 0 &&
        p[0] >= wx0 && p[0] <= wx1 && p[1] >= wy0 && p[1] <= wy1 &&
        inside(p, censusWaterArea),
    ),
  );
const WATER_KINDS = new Set(['H2030', 'H2040', 'H2041', 'H2051', 'H3010', 'H3020']);
const censusWater = areaWater.filter((record) => {
  const { MTFCC, AWATER } = record.props;
  if (!WATER_KINDS.has(MTFCC)) return false;
  // A pond a football pitch across is too small for this map; a bay or a
  // harbour's slips are what make a port look like one.
  return MTFCC === 'H2051' ? AWATER >= 20_000 : AWATER >= 150_000;
});
const neLakes = [...lakes10, ...lakesNA].filter(
  (feature) => !coveredByCensus(geojsonRings(feature.geometry)),
);

// Parks, forests and airports: California's, from TIGER's landmarks.
const PARKS = new Set([
  'K2180', 'K2181', 'K2183', 'K2184', 'K2185', 'K2186', 'K2187', 'K2188', 'K2189',
  'K2190', 'K2561', 'K2582',
]);
const parks = landmarks.filter((record) => PARKS.has(record.props.MTFCC));
const forests = landmarks.filter((record) => record.props.MTFCC === 'K2182');
const airports = landmarks.filter((record) => ['K2451', 'K2457'].includes(record.props.MTFCC));

// Roads: every state's freeways, and California's other state and U.S.
// highways and its main county roads.
const interstates = primaryRoads.filter((record) => record.props.RTTYP === 'I');
const freeways = primaryRoads.filter((record) => record.props.RTTYP !== 'I');
const highways = caRoads.filter(
  (record) => record.props.MTFCC === 'S1200' && ['U', 'S', 'I'].includes(record.props.RTTYP),
);
const arterials = caRoads.filter(
  (record) => record.props.MTFCC === 'S1200' && !['U', 'S', 'I'].includes(record.props.RTTYP),
);

// ---------------------------------------------------------------------------
// Names a map gives besides towns. Each is shown from `from` to `to`, in the
// server's tolerance (world units, a thousandth of a degree, per pixel or so),
// so a lake is named once it is big enough on screen to hold its name.

const labels = [];
const KIND = { ocean: 1, water: 2, park: 3, state: 4, country: 5 };
function addLabel(name, lon, lat, kind, rank, to, from = 0) {
  labels.push([name, Math.round(lon * 1e3) / 1e3, Math.round(lat * 1e3) / 1e3, KIND[kind], rank, Math.round(to * 10) / 10, from]);
}
// A shape `km` across fills 70 pixels at this tolerance.
const namedFrom = (km, pixels = 70) => (km / 0.111 / pixels) * 0.8;

for (const [name, lon, lat, to, from] of [
  ['Pacific Ocean', -124.8, 36.2, 400, 1],
  ['Pacific Ocean', -121.9, 33.2, 400, 1],
  ['Pacific Ocean', -125.8, 40.9, 400, 1],
  ['Pacific Ocean', -119.4, 32.9, 60, 1],
  ['Pacific Ocean', -140, 25, 1e4, 40],
  ['Gulf of California', -113.2, 30.2, 120, 2],
  ['Atlantic Ocean', -45, 30, 1e4, 40],
  ['Gulf of Mexico', -90, 25.5, 400, 8],
  ['Indian Ocean', 80, -20, 1e4, 40],
]) {
  addLabel(name, lon, lat, 'ocean', 0, to, from);
}

// Bays, lakes and reservoirs with names, largest first; one name for all a
// water body's parts, set in its largest.
const namedWater = new Map();
for (const record of censusWater) {
  const name = spell(record.props.FULLNAME || '');
  if (!name || record.props.MTFCC === 'H3010' || record.props.MTFCC === 'H3020') continue;
  const rings = record.parts;
  const entry = namedWater.get(name) || { km2: 0, biggest: null, biggestKm2: 0 };
  const km2 = record.props.AWATER / 1e6;
  entry.km2 += km2;
  if (km2 > entry.biggestKm2) {
    entry.biggest = rings;
    entry.biggestKm2 = km2;
  }
  namedWater.set(name, entry);
}
for (const [name, entry] of namedWater) {
  if (entry.km2 < 4 || /Pacific Ocean/.test(name)) continue;
  const at = labelPoint(entry.biggest);
  if (!at) continue;
  // Named until the whole of it is about seventy pixels across: a bay is
  // split among the counties on its shores, and its name belongs to all of it.
  addLabel(name, at.x, at.y, 'water', entry.km2, namedFrom(Math.sqrt(entry.km2) * 2));
}
for (const feature of neLakes) {
  const name = feature.properties.name;
  if (!name) continue;
  const rings = geojsonRings(feature.geometry).filter((ring) => signedArea(ring) > 0);
  const km2 = areaKm2(rings);
  if (km2 < 150) continue;
  const at = labelPoint(rings);
  if (at) addLabel(name, at.x, at.y, 'water', km2, namedFrom(Math.sqrt(km2) * 1.4));
}

// National parks and forests, and California's larger state parks.
const namedParks = new Map();
for (const record of landmarks) {
  if (!['K2181', 'K2182', 'K2184'].includes(record.props.MTFCC)) continue;
  const name = spell(record.props.FULLNAME || '');
  if (!name) continue;
  const km2 = record.props.ALAND / 1e6;
  const entry = namedParks.get(name) || { km2: 0, biggest: null, biggestKm2: 0 };
  entry.km2 += km2;
  if (km2 > entry.biggestKm2) {
    entry.biggest = record.parts;
    entry.biggestKm2 = km2;
  }
  namedParks.set(name, entry);
}
for (const [name, entry] of namedParks) {
  if (entry.km2 < 25) continue;
  const at = labelPoint(entry.biggest);
  if (at) addLabel(name, at.x, at.y, 'park', entry.km2, namedFrom(Math.sqrt(entry.km2), 110));
}

// States, from the continent down to a view about a state across; countries
// from the world down to about a country across.
for (const record of STATES) {
  const rings = shapeRings(record);
  const outlines = rings.filter((ring) => signedArea(ring) > 0);
  const biggest = outlines.reduce((a, b) => (areaKm2([b]) > areaKm2([a]) ? b : a));
  const at = labelPoint([biggest]);
  const km = Math.sqrt(areaKm2([biggest]));
  if (at) addLabel(record.props.NAME, at.x, at.y, 'state', km * km, namedFrom(km * 2, 60), namedFrom(km / 5, 60));
}
for (const feature of countries10) {
  const p = feature.properties;
  if (p.ADM0_A3 === 'USA' || !Number.isFinite(p.LABEL_X)) continue;
  const km2 = areaKm2(geojsonRings(feature.geometry));
  const km = Math.sqrt(km2);
  addLabel(p.NAME, p.LABEL_X, p.LABEL_Y, 'country', km2, namedFrom(km * 3, 60), namedFrom(km / 4, 60));
}
labels.sort((a, b) => a[3] - b[3] || b[4] - a[4]);

// ---------------------------------------------------------------------------
// The layers. `scale` is how finely a layer is stored (units per degree) and
// `tolerance` how far, in degrees, it is pre-simplified: finer than any view
// the map allows, so the server's own simplifying is all that shows.

const layers = {};
const stats = [];
function layer(name, shapes, { scale, tolerance, closed }) {
  const rings = encode(shapes, scale, tolerance, closed);
  layers[name] = { scale, closed, shapes: pack(rings) };
  stats.push([name, rings.length, rings.reduce((sum, ring) => sum + ring.length / 2, 0)]);
}
const NE50 = { scale: 100, tolerance: 0 };
const FINE = { scale: 1e4, tolerance: 0.00012 };
const MEDIUM = { scale: 1e4, tolerance: 0.0002 };
const COARSE = { scale: 1e4, tolerance: 0.0005 };
// Natural Earth's 1:10m is good to about a kilometre; closer points add size
// and nothing a reader can see.
const NE10 = { scale: 1e3, tolerance: 0.003 };

layer('land50', countries50.flatMap((f) => geojsonRings(f.geometry)), { ...NE50, closed: true });
layer('borders50', borders50Features.flatMap((f) => geojsonLines(f.geometry)), { ...NE50, closed: false });
layer(
  'states50',
  admin1Lines50.filter((f) => f.properties.ADM0_A3 === 'USA').flatMap((f) => geojsonLines(f.geometry)),
  { ...NE50, closed: false },
);
layer('land', us.outline, { ...FINE, closed: true });
layer('abroad', abroad, { ...NE10, closed: true });
layer('borders', borders10Features.flatMap((f) => geojsonLines(f.geometry)), { ...NE10, closed: false });
layer('states', us.shared, { ...MEDIUM, closed: false });
layer('counties', caCountyLines, { ...MEDIUM, closed: false });
// Built-up areas under about a square kilometre are the size of a town's
// dot, and at this scale their outlines follow city blocks.
layer(
  'urban',
  urbanCB.flatMap(shapeRings).filter((ring) => Math.abs(areaKm2([ring])) >= 1.5),
  { scale: 1e4, tolerance: 0.0008, closed: true },
);
layer('parks', parks.flatMap(shapeRings), { ...MEDIUM, closed: true });
layer('forests', forests.flatMap(shapeRings), { ...COARSE, closed: true });
layer('airports', airports.flatMap(shapeRings), { ...FINE, closed: true });
layer('water', censusWater.flatMap(shapeRings), { ...MEDIUM, closed: true });
layer('lakes', neLakes.flatMap((f) => geojsonRings(f.geometry)), { ...NE10, closed: true });
// Rivers are drawn only at the scale of a state or wider (closer in, the
// Census Bureau's water shows the river itself), so a coarse line does.
layer('rivers', [...rivers10, ...riversNA].flatMap((f) => geojsonLines(f.geometry)), {
  scale: 1e3,
  tolerance: 0.005,
  closed: false,
});
layer('interstates', interstates.flatMap((r) => r.parts), { ...MEDIUM, closed: false });
layer('freeways', freeways.flatMap((r) => r.parts), { ...MEDIUM, closed: false });
layer('highways', highways.flatMap((r) => r.parts), { ...MEDIUM, closed: false });
layer('arterials', arterials.flatMap((r) => r.parts), { ...COARSE, closed: false });

// Each California county's own outline, for the reader's county.
const counties = {};
for (const record of caCounties) {
  counties[`CA.${record.props.COUNTYFP}`] = pack(encode(shapeRings(record), 1e4, 0.0002, true));
}

const credit =
  'Map: Natural Earth; U.S. Census Bureau; terrain from Mapzen’s Terrain Tiles (SRTM, USGS, GMTED2010, ETOPO1).';
const mapOut = new URL('../lib/map-data.json', import.meta.url);
writeFileSync(mapOut, JSON.stringify({ credit, layers, counties, names: labels }));
for (const [name, rings, points] of stats) console.log(`  ${name.padEnd(12)} ${String(rings).padStart(6)} shapes ${String(points).padStart(8)} points`);
console.log(`lib/map-data.json: ${labels.length} names, ${(readFileSync(mapOut).length / 1e6).toFixed(1)} MB`);

if (!process.argv.includes('--vector')) {
  const { buildRelief } = await import('./build-relief.mjs');
  await buildRelief({ cache: CACHE, pool, download });
}
