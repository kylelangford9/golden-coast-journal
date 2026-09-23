#!/usr/bin/env node
/**
 * Builds lib/ca-districts.ts, the homepage's mini California, from the
 * congressional plan that Proposition 50 put in place: AB 604 (2025),
 * Chapter 96, Statutes of 2025, adopted by the voters on November 4, 2025 for
 * the 2026 to 2030 elections.
 *
 *   node scripts/build-ca-districts.mjs            downloads the Legislature's file
 *   node scripts/build-ca-districts.mjs file.zip   uses a copy already on disk
 *
 * Only the published files listed in SOURCES are accepted, checked by SHA-256,
 * so a boundary cannot change without someone reviewing it here first. The
 * Assembly and the Senate publish the same bytes; the Statewide Database's copy
 * is the same plan in NAD83 degrees rather than Web Mercator, and builds the
 * same map to within a rounding step.
 *
 * Every line on the map comes from the plan. Nothing is traced or redrawn: the
 * districts are projected, fitted to the view box and simplified, and a border
 * two districts share is simplified once so that they still meet exactly.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const SOURCES = [
  {
    url: 'https://aelc.assembly.ca.gov/system/files/2025-08/ab604.zip',
    publisher: 'California State Assembly, Committee on Elections: "AB 604 District Shapefile"',
    page: 'https://aelc.assembly.ca.gov/proposed-congressional-map',
    sha256: '0adf00848210b81abb38b62f24f05a854dc1f8dcfec44c8af5a4eb847c481f74',
  },
  {
    url: 'https://statewidedatabase.org/pub/data/d25/AB604%202025-08-16.zip',
    publisher: 'Statewide Database, UC Berkeley: shapefile of the AB 604 map',
    page: 'https://statewidedatabase.org/',
    sha256: '6b4c7e6db7a41feef43847915893cb1970b89e3eb3e237474603f9348dd5ddb9',
  },
];

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'ca-districts.ts');
const DISTRICT_COUNT = 52;

// A check on the numbering that does not come from the shapefile. Each city
// here lies wholly within one district according to the Statewide Database's
// "AB 604 City Splits Report"
// (https://statewidedatabase.org/pub/data/d25/AB%20604%20City%20Splits%20Report.pdf),
// and the point is inside that city's limits. Districts 11, 34, 37 and 46 are
// made only of split cities, so they have none. A build that numbers or places
// a district wrongly stops here.
const LANDMARKS = [
  [1, 'Chico', -121.8363, 39.7508],
  [2, 'Redding', -122.4034, 40.5823],
  [3, 'Grass Valley', -121.056, 39.2274],
  [4, 'Yuba City', -121.6344, 39.1478],
  [5, 'Oakdale', -120.8481, 37.7647],
  [6, 'Citrus Heights', -121.2904, 38.6952],
  [7, 'Galt', -121.2973, 38.2711],
  [8, 'Vacaville', -121.9645, 38.3484],
  [9, 'Tracy', -121.4364, 37.7404],
  [10, 'Danville', -121.9723, 37.8109],
  [12, 'Emeryville', -122.2915, 37.8393],
  [13, 'Los Banos', -120.8331, 37.0691],
  [14, 'Livermore', -121.7825, 37.6769],
  [15, 'Foster City', -122.2637, 37.5574],
  [16, 'Los Gatos', -121.9696, 37.2278],
  [17, 'Milpitas', -121.9002, 37.4315],
  [18, 'Greenfield', -121.2427, 36.3205],
  [19, 'Monterey', -121.9028, 36.5936],
  [20, 'Tehachapi', -118.4394, 35.1352],
  [21, 'Dinuba', -119.394, 36.5459],
  [22, 'Delano', -119.2593, 35.7676],
  [23, 'Barstow', -117.0966, 34.8468],
  [24, 'Santa Maria', -120.4424, 34.9284],
  [25, 'El Centro', -115.549, 32.7842],
  [26, 'Camarillo', -119.0084, 34.224],
  [27, 'Palmdale', -118.0896, 34.5653],
  [28, 'San Gabriel', -118.1006, 34.1021],
  [29, 'San Fernando', -118.4332, 34.2911],
  [30, 'Glendale', -118.249, 34.1782],
  [31, 'Covina', -117.8839, 34.0863],
  [32, 'Malibu', -118.8106, 34.0247],
  [33, 'Colton', -117.3181, 34.0598],
  [35, 'Ontario', -117.6035, 34.0304],
  [36, 'Rancho Palos Verdes', -118.3996, 33.7513],
  [38, 'El Monte', -118.0276, 34.0753],
  [39, 'Moreno Valley', -117.2063, 33.9191],
  [40, 'Wildomar', -117.2619, 33.6189],
  [41, 'Downey', -118.1331, 33.9377],
  [42, 'Avalon', -118.3339, 33.3361],
  [43, 'Hawthorne', -118.3483, 33.918],
  [44, 'Carson', -118.2585, 33.8331],
  [45, 'Fountain Valley', -117.9522, 33.7086],
  [47, 'Irvine', -117.7671, 33.6691],
  [48, 'Palm Springs', -116.5395, 33.8574],
  [49, 'Del Mar', -117.2628, 32.9719],
  [50, 'Poway', -117.0267, 32.9829],
  [51, 'La Mesa', -117.0201, 32.7716],
  [52, 'Chula Vista', -116.9671, 32.6246],
];

// The map is drawn about 116 CSS pixels wide, so one pixel is about 3.6 view
// box units. Borders are simplified to well under a pixel, and a small district
// is simplified in proportion to its own size so that the Los Angeles and Bay
// Area districts keep their shapes rather than their neighbours' tolerance.
const VIEW_WIDTH = 420;
const PADDING = 4;
const TOLERANCE = 0.45;
const SMALL_DISTRICT_FACTOR = 0.04;
const DECIMALS = 1;

// ---------------------------------------------------------------------------
// Reading the published zip, shapefile and attribute table.

function readZip(buffer) {
  let end = buffer.length - 22;
  while (end >= 0 && buffer.readUInt32LE(end) !== 0x06054b50) end -= 1;
  if (end < 0) throw new Error('Not a zip file.');
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const files = new Map();
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('Bad zip directory.');
    const method = buffer.readUInt16LE(offset + 10);
    const size = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const local = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    const start = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
    const raw = buffer.subarray(start, start + size);
    if (!name.startsWith('__MACOSX/') && !name.endsWith('/')) {
      files.set(name, method === 8 ? inflateRawSync(raw) : Buffer.from(raw));
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return files;
}

function readDbf(buffer) {
  const records = buffer.readUInt32LE(4);
  const headerLength = buffer.readUInt16LE(8);
  const recordLength = buffer.readUInt16LE(10);
  const fields = [];
  for (let at = 32; buffer[at] !== 0x0d; at += 32) {
    fields.push({
      name: buffer.toString('latin1', at, at + 11).split('\0')[0],
      length: buffer[at + 16],
    });
  }
  const rows = [];
  for (let i = 0; i < records; i += 1) {
    let at = headerLength + i * recordLength + 1;
    const row = {};
    for (const field of fields) {
      row[field.name] = buffer.toString('latin1', at, at + field.length).trim();
      at += field.length;
    }
    rows.push(row);
  }
  return rows;
}

function readPolygons(buffer) {
  const shapes = [];
  let at = 100;
  while (at < buffer.length) {
    const length = buffer.readInt32BE(at + 4) * 2;
    const body = at + 8;
    const type = buffer.readInt32LE(body);
    if (type !== 5) throw new Error(`Expected polygons, found shape type ${type}.`);
    const partCount = buffer.readInt32LE(body + 36);
    const pointCount = buffer.readInt32LE(body + 40);
    const starts = [];
    for (let i = 0; i < partCount; i += 1) starts.push(buffer.readInt32LE(body + 44 + i * 4));
    const pointsAt = body + 44 + partCount * 4;
    const rings = starts.map((start, i) => {
      const stop = i + 1 < partCount ? starts[i + 1] : pointCount;
      const ring = [];
      for (let p = start; p < stop; p += 1) {
        ring.push([buffer.readDoubleLE(pointsAt + p * 16), buffer.readDoubleLE(pointsAt + p * 16 + 8)]);
      }
      return ring;
    });
    shapes.push(rings);
    at = body + length;
  }
  return shapes;
}

// ---------------------------------------------------------------------------
// Projection: California Albers (EPSG:3310), the state's own equal-area
// projection, on the GRS 1980 ellipsoid.

const RADIANS = Math.PI / 180;
const A = 6378137;
const E2 = 2 / 298.257222101 - (1 / 298.257222101) ** 2;
const E = Math.sqrt(E2);
const m = (phi) => Math.cos(phi) / Math.sqrt(1 - E2 * Math.sin(phi) ** 2);
const q = (phi) => {
  const s = Math.sin(phi);
  return (1 - E2) * (s / (1 - E2 * s * s) - (1 / (2 * E)) * Math.log((1 - E * s) / (1 + E * s)));
};
const PHI1 = 34 * RADIANS;
const PHI2 = 40.5 * RADIANS;
const LAMBDA0 = -120 * RADIANS;
const N = (m(PHI1) ** 2 - m(PHI2) ** 2) / (q(PHI2) - q(PHI1));
const C = m(PHI1) ** 2 + N * q(PHI1);
const RHO0 = (A * Math.sqrt(C - N * q(0))) / N;

function albers(lon, lat) {
  const rho = (A * Math.sqrt(C - N * q(lat * RADIANS))) / N;
  const theta = N * (lon * RADIANS - LAMBDA0);
  return [rho * Math.sin(theta), RHO0 - rho * Math.cos(theta)];
}

/** Web Mercator (auxiliary sphere) metres back to degrees. */
function fromWebMercator(x, y) {
  return [x / A / RADIANS, (2 * Math.atan(Math.exp(y / A)) - Math.PI / 2) / RADIANS];
}

// ---------------------------------------------------------------------------
// Geometry helpers, all in view box units.

function ringArea(ring) {
  let sum = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    sum += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return sum / 2;
}

function segmentDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lengthSquared = dx * dx + dy * dy;
  let t = lengthSquared ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lengthSquared : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Douglas-Peucker; `keepOne` keeps the farthest point even inside tolerance. */
function simplify(points, tolerance, keepOne) {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  let first = true;
  while (stack.length) {
    const [from, to] = stack.pop();
    let farthest = -1;
    let distance = -1;
    for (let i = from + 1; i < to; i += 1) {
      const d = segmentDistance(points[i], points[from], points[to]);
      if (d > distance) {
        distance = d;
        farthest = i;
      }
    }
    if (farthest > 0 && (distance > tolerance || (first && keepOne))) {
      keep[farthest] = 1;
      stack.push([from, farthest], [farthest, to]);
    }
    first = false;
  }
  return points.filter((_, i) => keep[i]);
}

function contains(rings, x, y) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function edgeDistance(rings, x, y) {
  let best = Infinity;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      best = Math.min(best, segmentDistance([x, y], ring[j], ring[i]));
    }
  }
  return best;
}

/**
 * The point deepest inside a district and how much room it has there: where a
 * locator ring goes, and how small a district is on the page.
 */
function deepestPoint(rings) {
  let best = { x: 0, y: 0, room: -1 };
  for (const ring of rings) {
    const xs = ring.map((p) => p[0]);
    const ys = ring.map((p) => p[1]);
    let [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    let cell = Math.max(x1 - x0, y1 - y0) / 24;
    let local = { x: 0, y: 0, room: -1 };
    for (let round = 0; round < 6; round += 1) {
      for (let x = x0; x <= x1; x += cell) {
        for (let y = y0; y <= y1; y += cell) {
          if (!contains(rings, x, y)) continue;
          const room = edgeDistance(rings, x, y);
          if (room > local.room) local = { x, y, room };
        }
      }
      if (local.room < 0) break;
      [x0, x1, y0, y1] = [local.x - cell, local.x + cell, local.y - cell, local.y + cell];
      cell /= 4;
    }
    if (local.room > best.room) best = local;
  }
  return best;
}

// ---------------------------------------------------------------------------

async function loadSource(path) {
  const bytes = path ? readFileSync(path) : Buffer.from(await (await fetch(SOURCES[0].url)).arrayBuffer());
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const source = SOURCES.find((candidate) => candidate.sha256 === sha256);
  if (!source) {
    throw new Error(
      `Unrecognised boundary file (sha256 ${sha256}). Compare it with the published plan before adding it to SOURCES.`,
    );
  }
  const files = readZip(bytes);
  const find = (extension) => {
    const names = [...files.keys()].filter((name) => name.toLowerCase().endsWith(extension));
    if (names.length !== 1) throw new Error(`Expected one ${extension} in the zip, found ${names.length}.`);
    return files.get(names[0]);
  };
  return {
    source,
    sha256,
    shapes: readPolygons(find('.shp')),
    rows: readDbf(find('.dbf')),
    projection: find('.prj').toString('latin1'),
  };
}

async function main() {
  const { source, sha256, shapes, rows, projection } = await loadSource(process.argv[2]);
  const mercator = /Mercator/i.test(projection);
  if (!mercator && !projection.startsWith('GEOGCS[')) throw new Error(`Unexpected projection: ${projection}`);
  if (shapes.length !== rows.length) throw new Error('Shapes and attribute rows disagree.');

  // District numbers come from the plan's own DISTRICT field, never from the
  // order the shapes happen to be stored in.
  const numbers = rows.map((row) => {
    const n = Number(row.DISTRICT);
    if (!Number.isInteger(n) || n < 1 || n > DISTRICT_COUNT) {
      throw new Error(`Unexpected DISTRICT value "${row.DISTRICT}".`);
    }
    return n;
  });
  const unique = new Set(numbers);
  if (numbers.length !== DISTRICT_COUNT || unique.size !== DISTRICT_COUNT) {
    throw new Error(`Expected districts 1 to ${DISTRICT_COUNT} once each; found ${numbers.length} rows, ${unique.size} distinct.`);
  }

  // Project, keeping each source vertex's exact coordinates as its identity so
  // that the vertices two districts share can be found again.
  const projected = shapes.map((rings) =>
    rings.map((ring) =>
      ring.map(([x, y]) => {
        const [lon, lat] = mercator ? fromWebMercator(x, y) : [x, y];
        const [px, py] = albers(lon, lat);
        return { key: `${x},${y}`, x: px, y: py };
      }),
    ),
  );
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const point of projected.flat(2)) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  const scale = (VIEW_WIDTH - PADDING * 2) / (maxX - minX);
  const viewHeight = Math.ceil((maxY - minY) * scale + PADDING * 2);
  for (const point of projected.flat(2)) {
    point.x = PADDING + (point.x - minX) * scale;
    point.y = PADDING + (maxY - point.y) * scale;
  }

  // Each vertex's distinct neighbours. Where three districts meet, or a border
  // meets the coast, a vertex has more than two: those are the junctions where
  // one shared border (an arc) ends and the next begins.
  const neighbours = new Map();
  const link = (a, b) => {
    if (a === b) return;
    if (!neighbours.has(a)) neighbours.set(a, new Set());
    neighbours.get(a).add(b);
  };
  for (const ring of projected.flat()) {
    for (let i = 0; i + 1 < ring.length; i += 1) {
      link(ring[i].key, ring[i + 1].key);
      link(ring[i + 1].key, ring[i].key);
    }
  }
  const isJunction = (key) => (neighbours.get(key)?.size ?? 0) !== 2;

  const districts = projected.map((rings, index) => ({
    n: numbers[index],
    rings,
    area: rings.reduce((sum, ring) => sum + Math.abs(ringArea(ring.map((p) => [p.x, p.y]))), 0),
  }));

  // Cut every ring into arcs at its junctions, and file each arc under a key
  // that is the same whichever district, and whichever direction, reaches it.
  const arcs = new Map();
  const arcKey = (points) => {
    const k = points.map((p) => p.key);
    const forward = [k[0], k[1], k[k.length - 2], k[k.length - 1], k.length].join('|');
    const backward = [k[k.length - 1], k[k.length - 2], k[1], k[0], k.length].join('|');
    return forward <= backward ? { key: forward, reversed: false } : { key: backward, reversed: true };
  };
  for (const district of districts) {
    const tolerance = Math.min(TOLERANCE, SMALL_DISTRICT_FACTOR * Math.sqrt(district.area));
    district.ringArcs = district.rings.map((ring) => {
      const open = ring.slice(0, -1);
      let pieces;
      const firstJunction = open.findIndex((p) => isJunction(p.key));
      if (firstJunction < 0) {
        // A ring no border touches, such as an island: one closed arc, started
        // at its lowest key and run in a fixed direction.
        let start = 0;
        for (let i = 1; i < open.length; i += 1) if (open[i].key < open[start].key) start = i;
        const rotated = open.slice(start).concat(open.slice(0, start));
        pieces = [rotated.concat([rotated[0]])];
      } else {
        const rotated = open.slice(firstJunction).concat(open.slice(0, firstJunction));
        pieces = [];
        let current = [rotated[0]];
        for (let i = 1; i < rotated.length; i += 1) {
          current.push(rotated[i]);
          if (isJunction(rotated[i].key)) {
            pieces.push(current);
            current = [rotated[i]];
          }
        }
        current.push(rotated[0]);
        pieces.push(current);
      }
      return pieces.map((piece) => {
        const { key, reversed } = arcKey(piece);
        const arc = arcs.get(key) ?? {
          points: reversed ? piece.slice().reverse() : piece,
          tolerance,
          closed: piece[0].key === piece[piece.length - 1].key,
          keepOne: false,
          users: 0,
        };
        arc.tolerance = Math.min(arc.tolerance, tolerance);
        // A ring of one or two arcs would flatten to a line if each arc
        // simplified to its chord, so each arc of such a ring keeps a point.
        if (pieces.length <= 2) arc.keepOne = true;
        arc.users += 1;
        arcs.set(key, arc);
        return { key, reversed };
      });
    });
  }

  for (const arc of arcs.values()) {
    const points = arc.points.map((p) => [p.x, p.y]);
    if (arc.closed) {
      let far = 1;
      for (let i = 1; i < points.length - 1; i += 1) {
        if (Math.hypot(points[i][0] - points[0][0], points[i][1] - points[0][1]) >
            Math.hypot(points[far][0] - points[0][0], points[far][1] - points[0][1])) far = i;
      }
      const first = simplify(points.slice(0, far + 1), arc.tolerance, true);
      const second = simplify(points.slice(far), arc.tolerance, true);
      arc.simplified = first.concat(second.slice(1));
    } else {
      arc.simplified = simplify(points, arc.tolerance, arc.keepOne);
    }
  }

  const round = (value) => Number(value.toFixed(DECIMALS));
  const format = (value) => {
    const text = value.toFixed(DECIMALS).replace(/\.?0+$/, '');
    return text === '-0' ? '0' : text.replace(/^(-?)0\./, '$1.');
  };

  const output = [];
  const report = [];
  const built = new Map();
  for (const district of districts) {
    const rings = district.ringArcs.map((ringArcs) => {
      const ring = [];
      for (const { key, reversed } of ringArcs) {
        const points = arcs.get(key).simplified;
        const ordered = reversed ? points.slice().reverse() : points;
        for (const [x, y] of ring.length ? ordered.slice(1) : ordered) ring.push([round(x), round(y)]);
      }
      // Rounding can land two vertices on one spot; drop the repeats.
      const clean = ring.filter((p, i) => i === 0 || p[0] !== ring[i - 1][0] || p[1] !== ring[i - 1][1]);
      if (clean.length > 1 && clean[0][0] === clean.at(-1)[0] && clean[0][1] === clean.at(-1)[1]) clean.pop();
      return clean;
    });
    for (const ring of rings) {
      if (ring.length < 3 || Math.abs(ringArea(ring)) === 0) {
        throw new Error(`District ${district.n} lost a ring to simplification.`);
      }
    }

    built.set(district.n, rings);

    const area = rings.reduce((sum, ring) => sum + Math.abs(ringArea(ring)), 0);
    const ratio = area / district.area;
    if (ratio < 0.85 || ratio > 1.15) {
      throw new Error(`District ${district.n} changed area by ${((ratio - 1) * 100).toFixed(1)}% when simplified.`);
    }

    // Absolute start, then relative steps between the rounded vertices, so
    // rounding never accumulates. A minus sign separates numbers by itself.
    const numbers = (values) =>
      values.reduce((text, value) => (text && !value.startsWith('-') ? `${text} ${value}` : text + value), '');
    let d = '';
    for (const ring of rings) {
      const steps = [];
      for (let i = 1; i < ring.length; i += 1) {
        steps.push(format(ring[i][0] - ring[i - 1][0]), format(ring[i][1] - ring[i - 1][1]));
      }
      d += `M${numbers([format(ring[0][0]), format(ring[0][1])])}l${numbers(steps)}z`;
    }

    const deepest = deepestPoint(rings);
    output.push({ n: district.n, d, x: round(deepest.x), y: round(deepest.y), r: round(deepest.room) });
    report.push({ n: district.n, points: rings.reduce((sum, ring) => sum + ring.length, 0), ratio, room: deepest.room });
  }
  output.sort((a, b) => a.n - b.n);

  const numbered = output.map((district) => district.n).join(',');
  if (numbered !== Array.from({ length: DISTRICT_COUNT }, (_, i) => i + 1).join(',')) {
    throw new Error('The built map does not hold districts 1 to 52 exactly once.');
  }

  for (const [n, city, lon, lat] of LANDMARKS) {
    const [px, py] = albers(lon, lat);
    const x = PADDING + (px - minX) * scale;
    const y = PADDING + (maxY - py) * scale;
    const found = [...built].filter(([, rings]) => contains(rings, x, y)).map(([k]) => k);
    if (found.length !== 1 || found[0] !== n) {
      throw new Error(`${city} belongs in district ${n}, but the built map puts it in ${found.join(' and ') || 'none'}.`);
    }
  }

  const header = `// California's 52 congressional districts as Proposition 50 set them: the plan
// the Legislature passed as AB 604 (2025), chaptered on August 21, 2025 as
// Chapter 96, Statutes of 2025, which the voters adopted on November 4, 2025
// for the 2026 to 2030 elections. These are not the 2021 Citizens
// Redistricting Commission lines.
//
// Source: ${source.publisher}
//   ${source.url}
//   published at ${source.page}
//   sha256 ${sha256}
// The Senate publishes the Assembly's file byte for byte, and the Statewide
// Database's copy of the plan builds the same map to within a rounding step.
// Each district's number is the plan's own DISTRICT field.
//
// Generated by scripts/build-ca-districts.mjs; do not edit by hand. Projected
// to California Albers (EPSG:3310), fitted to the view box, and simplified to
// well under a pixel at the size the homepage draws it, with shared borders
// simplified once so neighbouring districts still meet.
`;

  const body = `${header}
export type CaDistrict = {
  /** District number, from the plan. */
  n: number;
  /** SVG path in view box units. */
  d: string;
  /** A point well inside the district. */
  x: number;
  y: number;
  /** Distance from that point to the district's nearest edge. */
  r: number;
};

export const CA_DISTRICT_VIEW_BOX = '0 0 ${VIEW_WIDTH} ${viewHeight}';

export const CA_DISTRICTS: readonly CaDistrict[] = [
${output.map((o) => `  { n: ${o.n}, x: ${o.x}, y: ${o.y}, r: ${o.r}, d: '${o.d}' },`).join('\n')}
];
`;
  writeFileSync(OUT, body);

  report.sort((a, b) => a.room - b.room);
  const points = report.reduce((sum, row) => sum + row.points, 0);
  console.log(`Wrote ${OUT}`);
  console.log(`  source: ${source.url}`);
  console.log(`  ${DISTRICT_COUNT} districts, ${arcs.size} arcs, ${points} points, ${(Buffer.byteLength(body) / 1024).toFixed(1)} KB, view box 0 0 ${VIEW_WIDTH} ${viewHeight}`);
  console.log(`  ${LANDMARKS.length} landmark cities in their districts`);
  console.log(`  area kept: ${Math.min(...report.map((r) => r.ratio)).toFixed(3)} to ${Math.max(...report.map((r) => r.ratio)).toFixed(3)}`);
  console.log(`  smallest: ${report.slice(0, 8).map((r) => `CA-${r.n} (room ${r.room.toFixed(1)}, ${r.points} pts)`).join(', ')}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
