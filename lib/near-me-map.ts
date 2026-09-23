/**
 * The News near Me map: the land, the U.S. states and California's counties,
 * drawn on the Journal's server for whatever part of the world the reader is
 * looking at, and sent as SVG paths.
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
 */

/** World units per degree. */
export const WORLD = 1000;

export type Projection = { lon0: number; cos: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type LatLon = { lat: number; lon: number };

/** Rings flattened to whole hundredths of a degree: [lon, lat, lon, lat, ...]. */
export type BaseMap = { credit: string; land: number[][]; states: number[][] };

/** California's county rings, [lon, lat], as the gazetteer keeps them. */
export type CountyShapes = Record<string, [number, number][][]>;

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

type PreparedRing = {
  points: number[];
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
};

const prepared = new WeakMap<number[][], PreparedRing[]>();

function prepare(rings: number[][], divisor: number) {
  let out = prepared.get(rings);
  if (out) return out;
  out = rings.map((ring) => {
    const points: number[] = [];
    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (let i = 0; i < ring.length; i += 2) {
      const lon = ring[i] / divisor;
      const lat = ring[i + 1] / divisor;
      points.push(lon, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    }
    return { points, minLon, maxLon, minLat, maxLat };
  });
  prepared.set(rings, out);
  return out;
}

/**
 * Sutherland–Hodgman against a rectangle. The rectangle is a little larger
 * than what the browser will show before it asks again, so the edges the cut
 * adds are never seen.
 */
function clip(points: Point[], [x0, y0, x1, y1]: [number, number, number, number]) {
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
  return out;
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
 * One path for every ring of a layer that crosses `bounds`, in whole world
 * units, each point after the first written as a step from the one before.
 */
function layerPath(p: Projection, rings: PreparedRing[], bounds: Rect, tolerance: number) {
  const margin = Math.max(bounds.w, bounds.h) * 0.02;
  const box: [number, number, number, number] = [
    bounds.x - margin,
    bounds.y - margin,
    bounds.x + bounds.w + margin,
    bounds.y + bounds.h + margin,
  ];
  const west = box[0] / (p.cos * WORLD) + p.lon0;
  const east = box[2] / (p.cos * WORLD) + p.lon0;
  const north = -box[1] / WORLD;
  const south = -box[3] / WORLD;
  const tiny = tolerance * 2.5;
  let d = '';
  for (const ring of rings) {
    if (ring.maxLat < south || ring.minLat > north) continue;
    // Natural Earth's rings never cross the antimeridian, so the whole ring
    // moves by the same whole turn as its first point.
    const shift = unwrap(ring.points[0], p.lon0) - ring.points[0];
    if (ring.maxLon + shift < west || ring.minLon + shift > east) continue;
    const projected: Point[] = [];
    for (let i = 0; i < ring.points.length; i += 2) {
      projected.push([
        (ring.points[i] + shift - p.lon0) * p.cos * WORLD,
        -ring.points[i + 1] * WORLD,
      ]);
    }
    const clipped = clip(projected, box);
    if (clipped.length < 3) continue;
    // An island smaller than a few pixels cannot be seen at this detail, and
    // at the scale of a continent there are thousands of them.
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (const [x, y] of clipped) {
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
    if (x1 - x0 < tiny && y1 - y0 < tiny) continue;
    const simple = simplify(clipped, tolerance);
    if (simple.length < 3) continue;
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
    if (steps >= 2) d += `${part}z`;
  }
  return d;
}

const countyRings = new WeakMap<CountyShapes, Map<string, number[][]>>();

function flatCounties(shapes: CountyShapes) {
  let out = countyRings.get(shapes);
  if (!out) {
    out = new Map(
      Object.entries(shapes).map(([key, rings]) => [
        key,
        rings.map((ring) => ring.flatMap(([lon, lat]) => [lon, lat])),
      ]),
    );
    countyRings.set(shapes, out);
  }
  return out;
}

const allCountyRings = new WeakMap<CountyShapes, number[][]>();

export type DrawnRegion = {
  bounds: Rect;
  tolerance: number;
  land: string;
  states: string;
  counties: string;
  highlight: string;
  /** Towns to name on the map, largest first: [name, x, y, population]. */
  labels: [string, number, number, number][];
};

/** The largest towns inside `bounds`, for the browser to name where there is room. */
function labelsIn(
  towns: [string, number, number, number][],
  p: Projection,
  bounds: Rect,
  limit = 60,
) {
  const out: [string, number, number, number][] = [];
  for (const [name, lat, lon, population] of towns) {
    const at = toWorld(p, lat, lon);
    if (at.x < bounds.x || at.y < bounds.y) continue;
    if (at.x > bounds.x + bounds.w || at.y > bounds.y + bounds.h) continue;
    out.push([name, Math.round(at.x), Math.round(at.y), population]);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * The layers for `bounds` at `tolerance` world units, about a pixel on the
 * reader's screen. State lines are drawn once a view is closer than about a
 * continent; county lines once it is closer than about a state.
 */
export function drawRegion(
  base: BaseMap,
  countyShapes: CountyShapes | undefined,
  p: Projection,
  bounds: Rect,
  tolerance: number,
  highlightCounties: string[],
  towns: [string, number, number, number][] = [],
): DrawnRegion {
  const counties = countyShapes ? flatCounties(countyShapes) : new Map<string, number[][]>();
  let everyCounty = countyShapes ? allCountyRings.get(countyShapes) : [];
  if (!everyCounty && countyShapes) {
    everyCounty = [...counties.values()].flat();
    allCountyRings.set(countyShapes, everyCounty);
  }
  const highlighted = highlightCounties.flatMap((key) => counties.get(key) || []);
  return {
    bounds,
    tolerance,
    land: layerPath(p, prepare(base.land, 100), bounds, tolerance),
    states: tolerance <= 90 ? layerPath(p, prepare(base.states, 100), bounds, tolerance) : '',
    counties:
      tolerance <= 22 && everyCounty?.length
        ? layerPath(p, prepare(everyCounty, 1), bounds, tolerance)
        : '',
    highlight: highlighted.length
      ? layerPath(p, prepare(highlighted, 1), bounds, tolerance)
      : '',
    labels: labelsIn(towns, p, bounds),
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
