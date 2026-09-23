/**
 * The News near Me map: the land and its borders, water, built-up areas,
 * parks, roads and shaded relief, drawn on the Journal's server for whatever
 * part of the world the reader is looking at, and sent as SVG paths and small
 * images.
 *
 * A tiled web map would have told a tile server where the reader is, which
 * the privacy page promises no mapping service learns. Instead the reader's
 * browser moves and zooms the drawing itself, as a map app does, and asks the
 * Journal (in the body of a POST, so in no request log) for the part of the
 * map it is about to show, at the detail that part needs.
 *
 * Everything is in world units: a thousandth of a degree, on an
 * equirectangular projection corrected for the reader's latitude and centred
 * on their longitude, so a view from Tokyo to California runs the short way
 * across the Pacific. Moving the map is then only a change of the SVG's
 * viewBox; nothing is redrawn until new detail arrives.
 *
 * The layers are built by scripts/build-map.mjs, which says where each comes
 * from.
 */

/** World units per degree. */
export const WORLD = 1000;

export type Projection = { lon0: number; cos: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type LatLon = { lat: number; lon: number };

/**
 * One layer of the base map: its shapes in whole units of 1/`scale` degree,
 * packed as scripts/build-map.mjs describes, and whether they are rings to
 * fill or lines to stroke.
 */
export type Layer = { scale: number; closed: boolean; shapes: string };

/** A name the map gives besides a town's: [name, lon, lat, kind, rank, to, from]. */
export type MapName = [string, number, number, number, number, number, number];

export type BaseMap = {
  credit: string;
  layers: Record<string, Layer>;
  /** Each California county's outline, packed as a layer's shapes are. */
  counties: Record<string, string>;
  names: MapName[];
};

/** Kinds of name, as scripts/build-map.mjs numbers them; towns are 0. */
export const NAME_KIND = { town: 0, ocean: 1, water: 2, park: 3, state: 4, country: 5 } as const;

const MILES_PER_DEGREE = 69.05;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** A longitude as seen from `lon0`: within half a turn either side of it. */
const unwrap = (lon: number, lon0: number) =>
  ((((lon - lon0 + 180) % 360) + 360) % 360) - 180 + lon0;

export function projectionFor(reader: LatLon): Projection {
  return {
    lon0: reader.lon,
    cos: Math.max(0.2, Math.cos(toRad(Math.max(-80, Math.min(80, reader.lat))))),
  };
}

export function toWorld(p: Projection, lat: number, lon: number) {
  return {
    x: (unwrap(lon, p.lon0) - p.lon0) * p.cos * WORLD,
    y: -lat * WORLD,
  };
}

/** World units for a distance on the ground, the same across and down. */
export const worldMiles = (miles: number) => (miles / MILES_PER_DEGREE) * WORLD;

/**
 * The first view: the reader, the ring round them and every point given, at
 * the shape asked for (width over height), with `pad` of the span spare at
 * each edge for what is drawn beside a point.
 */
export function frameView(
  p: Projection,
  reader: LatLon,
  points: LatLon[],
  ringMiles: number,
  aspect: number,
  pad: number,
): Rect {
  const you = toWorld(p, reader.lat, reader.lon);
  const ring = worldMiles(ringMiles);
  const xs = [you.x - ring, you.x + ring];
  const ys = [you.y - ring, you.y + ring];
  for (const point of points) {
    const at = toWorld(p, point.lat, point.lon);
    xs.push(at.x);
    ys.push(at.y);
  }
  let x0 = Math.min(...xs);
  let x1 = Math.max(...xs);
  let y0 = Math.min(...ys);
  let y1 = Math.max(...ys);
  const padX = (x1 - x0) * pad;
  const padY = (y1 - y0) * pad;
  x0 -= padX;
  x1 += padX;
  y0 -= padY;
  y1 += padY;
  const w = x1 - x0;
  const h = y1 - y0;
  if (w / h < aspect) {
    const grow = (h * aspect - w) / 2;
    x0 -= grow;
    x1 += grow;
  } else {
    const grow = (w / aspect - h) / 2;
    y0 -= grow;
    y1 += grow;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

type Point = [number, number];

type PreparedShape = {
  /** [lon, lat, lon, lat, ...] in degrees. */
  points: Float64Array;
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
};

/**
 * A layer's shapes, unpacked: base64 bytes, each number seven bits a byte
 * and zigzagged, each shape its number of points, then its first point and
 * the steps to the rest.
 */
export function unpack(packed: string, scale: number): PreparedShape[] {
  const bytes = Buffer.from(packed, 'base64');
  let at = 0;
  const read = () => {
    let n = 0;
    let shift = 1;
    for (;;) {
      const byte = bytes[at];
      at += 1;
      n += (byte & 0x7f) * shift;
      if (byte < 0x80) break;
      shift *= 0x80;
    }
    return n % 2 ? -(n + 1) / 2 : n / 2;
  };
  const shapes: PreparedShape[] = [];
  while (at < bytes.length) {
    const count = read();
    const points = new Float64Array(count * 2);
    let x = 0;
    let y = 0;
    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (let i = 0; i < count; i += 1) {
      x += read();
      y += read();
      const lon = x / scale;
      const lat = y / scale;
      points[i * 2] = lon;
      points[i * 2 + 1] = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    shapes.push({ points, minLon, maxLon, minLat, maxLat });
  }
  return shapes;
}

// Each layer is unpacked the first time a view needs it, and kept.
const unpacked = new WeakMap<Layer, PreparedShape[]>();
const unpackedCounties = new Map<string, PreparedShape[]>();

function shapesOf(layer: Layer) {
  let out = unpacked.get(layer);
  if (!out) {
    out = unpack(layer.shapes, layer.scale);
    unpacked.set(layer, out);
  }
  return out;
}

function countyShapes(base: BaseMap, key: string) {
  let out = unpackedCounties.get(key);
  if (!out && base.counties[key]) {
    out = unpack(base.counties[key], 1e4);
    unpackedCounties.set(key, out);
  }
  return out || [];
}

type Box = [number, number, number, number];

/**
 * Sutherland–Hodgman against a rectangle. The rectangle is a little larger
 * than what the browser will show before it asks again, so the edges the cut
 * adds are never seen.
 */
function clipRing(points: Point[], [x0, y0, x1, y1]: Box) {
  let out = points;
  for (let edge = 0; edge < 4 && out.length; edge += 1) {
    const inside = ([x, y]: Point) =>
      edge === 0 ? x >= x0 : edge === 1 ? y >= y0 : edge === 2 ? x <= x1 : y <= y1;
    const cross = ([ax, ay]: Point, [bx, by]: Point): Point => {
      if (edge === 0 || edge === 2) {
        const x = edge === 0 ? x0 : x1;
        return [x, ay + ((by - ay) * (x - ax)) / (bx - ax)];
      }
      const y = edge === 1 ? y0 : y1;
      return [ax + ((bx - ax) * (y - ay)) / (by - ay), y];
    };
    const input = out;
    out = [];
    let prev = input[input.length - 1];
    for (const point of input) {
      if (inside(point)) {
        if (!inside(prev)) out.push(cross(prev, point));
        out.push(point);
      } else if (inside(prev)) {
        out.push(cross(prev, point));
      }
      prev = point;
    }
  }
  return [out];
}

/**
 * Liang–Barsky, segment by segment: the parts of a line inside a rectangle,
 * as many runs as it goes in and out.
 */
function clipLine(points: Point[], [x0, y0, x1, y1]: Box) {
  const runs: Point[][] = [];
  let run: Point[] = [];
  for (let i = 1; i < points.length; i += 1) {
    const [ax, ay] = points[i - 1];
    const [bx, by] = points[i];
    const dx = bx - ax;
    const dy = by - ay;
    let t0 = 0;
    let t1 = 1;
    let visible = true;
    for (const [p, q] of [
      [-dx, ax - x0],
      [dx, x1 - ax],
      [-dy, ay - y0],
      [dy, y1 - ay],
    ]) {
      if (p === 0) {
        if (q < 0) visible = false;
        continue;
      }
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t);
      else t1 = Math.min(t1, t);
    }
    if (!visible || t0 > t1) {
      if (run.length > 1) runs.push(run);
      run = [];
      continue;
    }
    if (!run.length || t0 > 0) {
      if (run.length > 1) runs.push(run);
      run = [[ax + dx * t0, ay + dy * t0]];
    }
    run.push([ax + dx * t1, ay + dy * t1]);
    if (t1 < 1) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

/**
 * Douglas–Peucker: the fewest points that keep a line within `tolerance` of
 * where it was. A coastline drawn at the scale of Europe needs a few hundred
 * points, not the tens of thousands in the source.
 */
function simplify(points: Point[], tolerance: number) {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  const tol2 = tolerance * tolerance;
  while (stack.length) {
    const [from, to] = stack.pop()!;
    const [ax, ay] = points[from];
    const [bx, by] = points[to];
    const dx = bx - ax;
    const dy = by - ay;
    const length2 = dx * dx + dy * dy;
    let worst = -1;
    let worstDistance = tol2;
    for (let i = from + 1; i < to; i += 1) {
      const [px, py] = points[i];
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
 * One path for every shape of a layer that crosses `bounds`, in whole world
 * units, each point after the first written as a step from the one before.
 * Rings are closed; lines are not.
 */
function layerPath(
  p: Projection,
  shapes: PreparedShape[],
  closed: boolean,
  bounds: Rect,
  tolerance: number,
) {
  const margin = Math.max(bounds.w, bounds.h) * 0.02;
  const box: Box = [
    bounds.x - margin,
    bounds.y - margin,
    bounds.x + bounds.w + margin,
    bounds.y + bounds.h + margin,
  ];
  const west = box[0] / (p.cos * WORLD) + p.lon0;
  const east = box[2] / (p.cos * WORLD) + p.lon0;
  const north = -box[1] / WORLD;
  const south = -box[3] / WORLD;
  // A shape smaller than a few pixels cannot be seen at this detail, and at
  // the scale of a continent there are thousands of them.
  const tiny = tolerance * 2.5;
  const parts: string[] = [];
  for (const shape of shapes) {
    if (shape.maxLat < south || shape.minLat > north) continue;
    // No shape crosses the antimeridian, so the whole of one moves by the
    // same whole turn as its first point.
    const shift = unwrap(shape.points[0], p.lon0) - shape.points[0];
    if (shape.maxLon + shift < west || shape.minLon + shift > east) continue;
    if (
      (shape.maxLon - shape.minLon) * p.cos * WORLD < tiny &&
      (shape.maxLat - shape.minLat) * WORLD < tiny
    ) {
      continue;
    }
    const projected: Point[] = [];
    for (let i = 0; i < shape.points.length; i += 2) {
      projected.push([
        (shape.points[i] + shift - p.lon0) * p.cos * WORLD,
        -shape.points[i + 1] * WORLD,
      ]);
    }
    for (const piece of closed ? clipRing(projected, box) : clipLine(projected, box)) {
      if (piece.length < (closed ? 3 : 2)) continue;
      const simple = simplify(piece, tolerance);
      if (simple.length < (closed ? 3 : 2)) continue;
      let px = Math.round(simple[0][0]);
      let py = Math.round(simple[0][1]);
      let part = `M${px} ${py}l`;
      let steps = 0;
      for (let i = 1; i < simple.length; i += 1) {
        const x = Math.round(simple[i][0]);
        const y = Math.round(simple[i][1]);
        if (x === px && y === py) continue;
        part += `${steps ? ' ' : ''}${x - px} ${y - py}`;
        px = x;
        py = y;
        steps += 1;
      }
      if (steps >= (closed ? 2 : 1)) parts.push(closed ? `${part}z` : part);
    }
  }
  return parts.join('');
}

/**
 * What the browser draws, by layer, each from one or more of the base map's.
 * A layer is drawn while the view's tolerance is at least `from` and less
 * than `to`: whole continents from Natural Earth's 1:50m, closer in from its
 * 1:10m and the Census Bureau's 1:500,000; state and county lines, parks and
 * roads only once they are close enough to read.
 */
const DRAWN: Record<string, [string, number, number][]> = {
  land: [
    ['land50', 25, Infinity],
    ['land', 0, 25],
    ['abroad', 0, 25],
  ],
  urban: [['urban', 0, 30]],
  forests: [['forests', 0, 40]],
  parks: [['parks', 0, 30]],
  airports: [['airports', 0, 4]],
  water: [
    ['water', 0, 30],
    ['lakes', 0, Infinity],
  ],
  rivers: [['rivers', 2.5, 60]],
  borders: [
    ['borders50', 25, Infinity],
    ['borders', 0, 25],
  ],
  states: [
    ['states50', 25, 120],
    ['states', 0, 25],
  ],
  counties: [['counties', 0, 22]],
  arterials: [['arterials', 0, 1.6]],
  highways: [['highways', 0, 6]],
  motorways: [
    ['interstates', 0, 60],
    ['freeways', 0, 15],
  ],
};

export type DrawnLayers = Record<keyof typeof DRAWN, string>;

/** A tile of shaded relief on the map: [key, x, y, w, h] in world units. */
export type ReliefTile = [string, number, number, number, number];

/** A name to set on the map: [name, x, y, rank, kind]. */
export type DrawnName = [string, number, number, number, number];

export type DrawnRegion = {
  bounds: Rect;
  tolerance: number;
  layers: DrawnLayers;
  highlight: string;
  /** Names largest first within each kind, in the order they are placed. */
  labels: DrawnName[];
  relief: ReliefTile[];
  /** Each relief tile the browser does not already have, as a data: URL. */
  images: Record<string, string>;
};

/**
 * The shaded relief, as lib/relief.bin holds it (see scripts/build-relief.mjs):
 * `levels` degrees a pixel, each four times finer than the one before; a
 * level's tiles are `size` pixels and nest four across in the level above.
 * The finer levels cover only part of the world, `coverage` saying which of
 * the level above's tiles they fill.
 */
export type Relief = {
  size: number;
  levels: number[];
  coverage: Record<string, Set<string>>;
  tiles: Record<string, [number, number]>;
  data: Uint8Array;
};

export function readRelief(file: Uint8Array): Relief {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  if (String.fromCharCode(...file.subarray(0, 4)) !== 'GCJR') throw new Error('not a relief file');
  const length = view.getUint32(4, true);
  const index = JSON.parse(new TextDecoder().decode(file.subarray(8, 8 + length)));
  return {
    ...index,
    coverage: Object.fromEntries(
      Object.entries(index.coverage as Record<string, string[]>).map(([level, keys]) => [
        level,
        new Set(keys),
      ]),
    ),
    data: file.subarray(8 + length),
  };
}

const MAX_RELIEF_TILES = 36;

/**
 * The relief tiles over `bounds`: from the finest level whose pixels are no
 * smaller than about two-thirds of a screen pixel (softer than the land's
 * lines, as relief on a map is), falling back to a coarser level where the
 * finer does not reach, and to a coarser level again if a view would need
 * more tiles than one answer should carry.
 */
export function reliefTiles(
  relief: Relief,
  p: Projection,
  bounds: Rect,
  unitsPerPixel: number,
): ReliefTile[] {
  const cover = relief.coverage;
  const west = bounds.x / (p.cos * WORLD) + p.lon0;
  const east = (bounds.x + bounds.w) / (p.cos * WORLD) + p.lon0;
  const north = Math.min(85, -bounds.y / WORLD);
  const south = Math.max(-85, -(bounds.y + bounds.h) / WORLD);
  const span = (level: number) => relief.levels[level] * relief.size;
  let want = 0;
  for (let level = relief.levels.length - 1; level >= 0; level -= 1) {
    if ((relief.levels[level] * WORLD * p.cos) / unitsPerPixel >= 0.66) {
      want = level;
      break;
    }
  }
  const base = Math.min(2, relief.levels.length - 1);
  for (; want >= 0; want -= 1) {
    const out: ReliefTile[] = [];
    const add = (level: number, i: number, j: number, shift: number) => {
      const t = span(level);
      const left = -180 + i * t + shift;
      const top = 90 - j * t;
      if (left + t < west || left > east || top - t > north || top < south) return;
      const key = `${level}/${i}/${j}`;
      if (level < want && cover[level + 1]?.has(key)) {
        for (let di = 0; di < 4; di += 1) {
          for (let dj = 0; dj < 4; dj += 1) add(level + 1, i * 4 + di, j * 4 + dj, shift);
        }
        return;
      }
      if (!relief.tiles[key]) return;
      out.push([
        key,
        Math.round((left - p.lon0) * p.cos * WORLD * 10) / 10,
        Math.round(-top * WORLD * 10) / 10,
        Math.round(t * p.cos * WORLD * 10) / 10,
        Math.round(t * WORLD * 10) / 10,
      ]);
    };
    const top = Math.min(want, base);
    const t = span(top);
    for (let i = 0; i < Math.ceil(360 / t); i += 1) {
      const left = -180 + i * t;
      const shift = unwrap(left, p.lon0) - left;
      for (let j = 0; j < Math.ceil(180 / t); j += 1) add(top, i, j, shift);
    }
    if (out.length <= MAX_RELIEF_TILES || want === 0) return out;
  }
  return [];
}

/** A relief tile as a data: URL, for the browser to draw without asking again. */
export function reliefImage(relief: Relief, key: string) {
  const [offset, length] = relief.tiles[key];
  return `data:image/webp;base64,${Buffer.from(relief.data.subarray(offset, offset + length)).toString('base64')}`;
}

/** The names inside `bounds` that suit this tolerance, in the order to place them. */
function namesIn(
  base: BaseMap,
  towns: [string, number, number, number][],
  p: Projection,
  bounds: Rect,
  tolerance: number,
) {
  const inView = (x: number, y: number) =>
    x >= bounds.x && y >= bounds.y && x <= bounds.x + bounds.w && y <= bounds.y + bounds.h;
  const features = (kinds: number[]) => {
    const out: DrawnName[] = [];
    for (const [name, lon, lat, kind, rank, to, from] of base.names || []) {
      if (!kinds.includes(kind) || tolerance >= to || tolerance < from) continue;
      const at = toWorld(p, lat, lon);
      if (inView(at.x, at.y)) out.push([name, Math.round(at.x), Math.round(at.y), rank, kind]);
    }
    return out;
  };
  const townNames: DrawnName[] = [];
  for (const [name, lat, lon, population] of towns) {
    const at = toWorld(p, lat, lon);
    if (!inView(at.x, at.y)) continue;
    townNames.push([name, Math.round(at.x), Math.round(at.y), population, NAME_KIND.town]);
    if (townNames.length >= 60) break;
  }
  // Water first (its names sit in water, where no town is), then towns,
  // then the names of wider areas where there is room left, parks last.
  return [
    ...features([NAME_KIND.ocean, NAME_KIND.water]).slice(0, 12),
    ...townNames,
    ...features([NAME_KIND.country, NAME_KIND.state]).slice(0, 16),
    ...features([NAME_KIND.park]).slice(0, 10),
  ];
}

/**
 * The layers for `bounds` at `tolerance` world units, about a pixel on the
 * reader's screen, and the relief tiles for it, sending the image of each the
 * browser does not list in `have`.
 */
export function drawRegion(
  base: BaseMap,
  p: Projection,
  bounds: Rect,
  tolerance: number,
  highlightCounties: string[],
  towns: [string, number, number, number][] = [],
  relief?: Relief,
  have: Set<string> = new Set(),
): DrawnRegion {
  const layers = {} as DrawnLayers;
  for (const [name, sources] of Object.entries(DRAWN)) {
    layers[name as keyof DrawnLayers] = sources
      .filter(([source, from, to]) => tolerance >= from && tolerance < to && base.layers[source])
      .map(([source]) => {
        const layer = base.layers[source];
        return layerPath(p, shapesOf(layer), layer.closed, bounds, tolerance);
      })
      .join('');
  }
  const highlighted = highlightCounties.flatMap((key) => countyShapes(base, key));
  const tiles = relief ? reliefTiles(relief, p, bounds, tolerance / 0.8) : [];
  const images: Record<string, string> = {};
  for (const [key] of tiles) if (!have.has(key)) images[key] = reliefImage(relief!, key);
  return {
    bounds,
    tolerance,
    layers,
    highlight: highlighted.length ? layerPath(p, highlighted, true, bounds, tolerance) : '',
    labels: namesIn(base, towns, p, bounds, tolerance),
    relief: tiles,
    images,
  };
}

/** A view widened by `by` of its size on every side: what is drawn ahead of a pan. */
export function widen(view: Rect, by: number): Rect {
  return {
    x: view.x - view.w * by,
    y: view.y - view.h * by,
    w: view.w * (1 + 2 * by),
    h: view.h * (1 + 2 * by),
  };
}
