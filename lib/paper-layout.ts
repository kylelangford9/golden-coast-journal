/**
 * What the News near Me map shows at its current zoom: which stories are
 * drawn as mini front pages, where each page sits, and which are folded into
 * a numbered bubble, the way a map app declutters its labels.
 *
 * Stories come nearest the reader first. Those closer on screen than a page
 * is wide are one group. Each group, in turn, gets a page beside its place if
 * a spot is free of the pages already down, of the reader's dot and of every
 * place; otherwise it is a bubble, and zooming in opens it up. A page keeps
 * its spot from the last layout while that spot stays free, so pages do not
 * jump about as the map is moved. It runs in the browser, which alone knows
 * how many pixels the map has.
 */

export type Point = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

export type Group = {
  /** The first story's slug: stable while the same story leads the group. */
  id: string;
  x: number;
  y: number;
  members: number[];
};

/** A page's top-left corner, from its place. */
export type Offset = { dx: number; dy: number };

// Straight out from the place, then the corners, each at three distances.
const DIRECTIONS: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
  [0.8, -0.8],
  [-0.8, -0.8],
  [0.8, 0.8],
  [-0.8, 0.8],
];
const DISTANCES = [10, 26, 46];
const EDGE = 4;

function overlap(a: Box, b: Box) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

const around = (p: Point, r: number): Box => ({ x: p.x - r, y: p.y - r, w: 2 * r, h: 2 * r });

/** The point on a page's edge nearest its place, where the line meets it. */
export function edgePoint(box: Box, p: Point): Point {
  return {
    x: Math.min(box.x + box.w, Math.max(box.x, p.x)),
    y: Math.min(box.y + box.h, Math.max(box.y, p.y)),
  };
}

/** Stories closer on screen than `radius` to a group's first story join it. */
export function groupStories(ids: string[], points: Point[], radius: number): Group[] {
  const groups: Group[] = [];
  points.forEach((point, index) => {
    const group = groups.find((g) => Math.hypot(g.x - point.x, g.y - point.y) < radius);
    if (group) group.members.push(index);
    else groups.push({ id: ids[index], x: point.x, y: point.y, members: [index] });
  });
  return groups;
}

/**
 * Pages for as many groups as fit, at most `max`. Returns each paged group's
 * offset; a group not in the result is drawn as a bubble.
 */
export function placePages(
  groups: Group[],
  avoid: Box[],
  width: number,
  height: number,
  size: { w: number; h: number },
  max: number,
  previous: Map<string, Offset>,
): Map<string, Offset> {
  const placed: Box[] = [];
  const out = new Map<string, Offset>();
  const places = groups.map((group) => around(group, 7));
  const inView = (box: Box) =>
    box.x >= EDGE && box.y >= EDGE && box.x + box.w <= width - EDGE && box.y + box.h <= height - EDGE;
  const score = (box: Box, index: number) => {
    let total = 0;
    for (const other of placed) total += 4 * overlap(box, other);
    for (const other of avoid) total += 3 * overlap(box, other);
    for (const [j, place] of places.entries()) {
      // Its own place must stay visible beside it, as must every other.
      total += (j === index ? 40 : 6) * overlap(box, place);
    }
    return total;
  };

  for (const [index, group] of groups.entries()) {
    if (out.size >= max) break;
    if (group.x < 0 || group.y < 0 || group.x > width || group.y > height) continue;
    const kept = previous.get(group.id);
    if (kept) {
      const box = { x: group.x + kept.dx, y: group.y + kept.dy, ...size };
      if (inView(box) && score(box, index) === 0) {
        placed.push(box);
        out.set(group.id, kept);
        continue;
      }
    }
    let best: Box | null = null;
    let bestScore = Infinity;
    for (const distance of DISTANCES) {
      for (const [dx, dy] of DIRECTIONS) {
        const box: Box = {
          x: Math.min(
            width - size.w - EDGE,
            Math.max(EDGE, group.x + dx * (size.w / 2 + distance) - size.w / 2),
          ),
          y: Math.min(
            height - size.h - EDGE,
            Math.max(EDGE, group.y + dy * (size.h / 2 + distance) - size.h / 2),
          ),
          ...size,
        };
        const centre = { x: box.x + box.w / 2, y: box.y + box.h / 2 };
        const total =
          score(box, index) * 1000 + Math.hypot(centre.x - group.x, centre.y - group.y);
        if (total < bestScore) {
          bestScore = total;
          best = box;
        }
      }
    }
    // A page that would cover another page or a place is not drawn: the group
    // is a bubble until the reader zooms in and there is room.
    if (best && bestScore < 1000) {
      placed.push(best);
      out.set(group.id, { dx: best.x - group.x, dy: best.y - group.y });
    }
  }
  return out;
}

/**
 * A name for the map. `kind` is what it names, as lib/near-me-map.ts numbers
 * them: a town (0, the default), an ocean, a bay or lake, a park, a state or
 * a country. `population` ranks towns; for the rest it is only carried.
 */
export type Label = { name: string; x: number; y: number; population: number; kind?: number };

export type PlacedLabel = Label & {
  box: Box;
  lines: string[];
  /** Where the name sits against its point: beside a town's dot, or over the place. */
  align: 'left' | 'right' | 'center';
};

// The type each kind is set in, as the stylesheet sets it: the average width
// of a letter and the height of a line, in pixels.
const TYPE: Record<number, { letter: number; line: number }> = {
  0: { letter: 6.2, line: 15 },
  1: { letter: 7.4, line: 15 },
  2: { letter: 5.9, line: 14 },
  3: { letter: 5.6, line: 13 },
  4: { letter: 9.4, line: 14 },
  5: { letter: 9.9, line: 15 },
};
const DOT = 3;
const GAP = 4;

/** A long name over two lines, split at the space nearest its middle. */
function wrap(name: string) {
  if (name.length <= 14 || !name.includes(' ')) return [name];
  let best = -1;
  for (let i = name.indexOf(' '); i >= 0; i = name.indexOf(' ', i + 1)) {
    if (best < 0 || Math.abs(i - name.length / 2) < Math.abs(best - name.length / 2)) best = i;
  }
  return [name.slice(0, best), name.slice(best + 1)];
}

/**
 * Which names to set on screen, in the order given (the server sends water
 * first, then towns largest first, then states, countries and parks), each
 * only where it clears the pages, the bubbles, the reader's dot and the names
 * already down, as a map app names fewer places the farther out it is. A
 * town's name goes beside its dot (to the right, else the left, above or
 * below); any other name is centred on its place.
 */
export function chooseLabels(
  labels: Label[],
  obstacles: Box[],
  width: number,
  height: number,
  max: number,
): PlacedLabel[] {
  const chosen: PlacedLabel[] = [];
  const taken: Box[] = [];
  const fits = (box: Box) => {
    if (box.x < 2 || box.y < 2 || box.x + box.w > width - 2 || box.y + box.h > height - 2) {
      return false;
    }
    const padded = { x: box.x - 4, y: box.y - 3, w: box.w + 8, h: box.h + 6 };
    return (
      !obstacles.some((other) => overlap(padded, other) > 0) &&
      !taken.some((other) => overlap(padded, other) > 0)
    );
  };
  for (const label of labels) {
    if (chosen.length >= max) break;
    const kind = label.kind ?? 0;
    const type = TYPE[kind] ?? TYPE[0];
    const lines = kind === 0 ? [label.name] : wrap(label.name);
    const letter = kind === 0 && label.population >= 1_000_000 ? 7 : type.letter;
    const w = Math.max(...lines.map((line) => line.length)) * letter + 4;
    const h = lines.length * type.line;
    if (kind !== 0) {
      const box = { x: label.x - w / 2, y: label.y - h / 2, w, h };
      if (!fits(box)) continue;
      taken.push(box);
      chosen.push({ ...label, box, lines, align: 'center' });
      continue;
    }
    const dot = { x: label.x - DOT, y: label.y - DOT, w: DOT * 2, h: DOT * 2 };
    if (!fits(dot)) continue;
    const spots: [Box, PlacedLabel['align']][] = [
      [{ x: label.x + DOT + GAP, y: label.y - h / 2, w, h }, 'left'],
      [{ x: label.x - DOT - GAP - w, y: label.y - h / 2, w, h }, 'right'],
      [{ x: label.x - w / 2, y: label.y - DOT - GAP / 2 - h, w, h }, 'center'],
      [{ x: label.x - w / 2, y: label.y + DOT + GAP / 2, w, h }, 'center'],
    ];
    const spot = spots.find(([box]) => fits(box));
    if (!spot) continue;
    taken.push(dot, spot[0]);
    chosen.push({ ...label, box: spot[0], lines, align: spot[1] });
  }
  return chosen;
}
