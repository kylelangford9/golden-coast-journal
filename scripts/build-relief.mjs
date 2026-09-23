/**
 * Shaded relief for the News near Me map, written to lib/relief.bin by
 * scripts/build-map.mjs.
 *
 * Elevations come from the Terrain Tiles on the Registry of Open Data on AWS
 * (Mapzen's "terrarium" encoding, from SRTM, USGS 3DEP/NED, GMTED2010 and
 * ETOPO1). They are resampled from Web Mercator onto the map's own grid (a
 * fixed number of degrees a pixel, so a tile lies on the map as a rectangle
 * whatever the reader's projection) and shaded as if lit from the north-west,
 * as relief on a printed map is. A tile is a 256-pixel WebP of one warm dark
 * colour, the shadow's strength in its alpha: slopes facing away from the
 * light are shaded, the rest (flat ground, the sea, sunlit slopes) is clear,
 * so it lies over the map without a blend mode, which some phones draw slowly
 * while a map moves. A tile with nothing on it is not kept.
 *
 * Five levels, each four times finer than the last. The three coarsest cover
 * the world; the next the contiguous United States; the finest, about 250
 * metres a pixel, California and its borders.
 */
import { writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

const SIZE = 256;
const TERRAIN = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';

// Degrees a pixel at each level; a tile is SIZE of them. Every level's tiles
// nest four across in the one above, from the same corner (180°W, 90°N).
const LEVELS = [
  { deg: 0.64, exaggeration: 9 },
  { deg: 0.16, exaggeration: 6 },
  { deg: 0.04, exaggeration: 3.6, zoom: 5 },
  { deg: 0.01, exaggeration: 2.2, zoom: 7 },
  { deg: 0.0025, exaggeration: 1.5, zoom: 9 },
];
const tileDeg = (level) => LEVELS[level].deg * SIZE;

// Level 3 covers the level-2 tiles over the contiguous United States; level 4
// the level-3 tiles over California.
const US = { west: -125, east: -66.5, south: 24, north: 49.5 };
const CALIFORNIA = { west: -124.6, east: -114, south: 32.4, north: 42.1 };

function tilesOver(level, box) {
  const t = tileDeg(level);
  const out = [];
  for (let i = Math.floor((box.west + 180) / t); i <= Math.floor((box.east + 180) / t); i += 1) {
    for (let j = Math.floor((90 - box.north) / t); j <= Math.floor((90 - box.south) / t); j += 1) {
      out.push([i, j]);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------

/** The elevations of one terrarium tile, in metres, the sea floor as sea level. */
async function terrain(download, z, x, y) {
  const file = await download(`${TERRAIN}/${z}/${x}/${y}.png`);
  const { data, info } = await sharp(await readFile(file)).raw().toBuffer({ resolveWithObject: true });
  const out = new Float32Array(SIZE * SIZE);
  for (let p = 0; p < SIZE * SIZE; p += 1) {
    const at = p * info.channels;
    const metres = data[at] * 256 + data[at + 1] + data[at + 2] / 256 - 32768;
    out[p] = Math.max(0, metres);
  }
  return out;
}

const mercX = (lon, z) => ((lon + 180) / 360) * 2 ** z * SIZE;
const mercY = (lat, z) => {
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 2 ** z * SIZE;
};

/**
 * Elevations on the level's grid over `box` (whole tiles, plus a pixel all
 * round for the slope at the edges), sampled bilinearly from the terrarium
 * tiles at `zoom`.
 */
async function elevations(download, pool, level, box, zoom) {
  const { deg } = LEVELS[level];
  const width = Math.round((box.east - box.west) / deg) + 2;
  const height = Math.round((box.north - box.south) / deg) + 2;
  const lonAt = (x) => box.west + (x - 0.5) * deg;
  const latAt = (y) => box.north - (y - 0.5) * deg;

  const n = 2 ** zoom;
  const wanted = new Set();
  const x0 = Math.floor(mercX(lonAt(0), zoom) / SIZE) - 1;
  const x1 = Math.floor(mercX(lonAt(width), zoom) / SIZE) + 1;
  const y0 = Math.max(0, Math.floor(mercY(latAt(0), zoom) / SIZE) - 1);
  const y1 = Math.min(n - 1, Math.floor(mercY(latAt(height), zoom) / SIZE) + 1);
  for (let x = x0; x <= x1; x += 1) {
    for (let y = y0; y <= y1; y += 1) wanted.add(`${((x % n) + n) % n}/${y}`);
  }
  const tiles = new Map();
  const keys = [...wanted];
  let done = 0;
  await pool(keys, 16, async (key) => {
    const [x, y] = key.split('/').map(Number);
    tiles.set(key, await terrain(download, zoom, x, y));
    done += 1;
    if (done % 100 === 0) console.log(`    ${done}/${keys.length} terrain tiles at z${zoom}`);
  });

  const sample = (px, py) => {
    const tx = ((Math.floor(px / SIZE) % n) + n) % n;
    const ty = Math.floor(py / SIZE);
    const tile = tiles.get(`${tx}/${ty}`);
    if (!tile) return 0;
    const u = Math.min(SIZE - 1, Math.max(0, Math.floor(px - Math.floor(px / SIZE) * SIZE)));
    const v = Math.min(SIZE - 1, Math.max(0, Math.floor(py - ty * SIZE)));
    return tile[v * SIZE + u];
  };
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const lat = latAt(y);
    if (lat > 85 || lat < -85) continue;
    const my = mercY(lat, zoom) - 0.5;
    for (let x = 0; x < width; x += 1) {
      const mx = mercX(lonAt(x), zoom) - 0.5;
      const fx = Math.floor(mx);
      const fy = Math.floor(my);
      const ax = mx - fx;
      const ay = my - fy;
      out[y * width + x] =
        sample(fx, fy) * (1 - ax) * (1 - ay) +
        sample(fx + 1, fy) * ax * (1 - ay) +
        sample(fx, fy + 1) * (1 - ax) * ay +
        sample(fx + 1, fy + 1) * ax * ay;
    }
  }
  return { width, height, data: out };
}

/** A grid four times coarser, each cell the mean of the sixteen under it. */
function coarsen(grid) {
  // The grid carries a one-pixel border; the coarse one is rebuilt with its own.
  const inner = { width: grid.width - 2, height: grid.height - 2 };
  const width = inner.width / 4 + 2;
  const height = inner.height / 4 + 2;
  const out = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let sum = 0;
      for (let dy = 0; dy < 4; dy += 1) {
        for (let dx = 0; dx < 4; dx += 1) {
          sum += grid.data[(1 + (y - 1) * 4 + dy) * grid.width + 1 + (x - 1) * 4 + dx];
        }
      }
      out[y * width + x] = sum / 16;
    }
  }
  // The border repeats its neighbour, so the edge's slope is its own.
  for (let x = 0; x < width; x += 1) {
    out[x] = out[width + x];
    out[(height - 1) * width + x] = out[(height - 2) * width + x];
  }
  for (let y = 0; y < height; y += 1) {
    out[y * width] = out[y * width + 1];
    out[y * width + width - 1] = out[y * width + width - 2];
  }
  return { width, height, data: out };
}

// Lit from the north-west, 45° up.
const AZIMUTH = (315 * Math.PI) / 180;
const ZENITH = (45 * Math.PI) / 180;
const FLAT = Math.cos(ZENITH);

/**
 * The tiles of one level over `box`, whose top-left tile is (i0, j0), shaded
 * by Horn's method. Returns the tiles that have any relief on them.
 */
async function shadeTiles(level, grid, box, i0, j0) {
  const { deg, exaggeration } = LEVELS[level];
  const across = (grid.width - 2) / SIZE;
  const down = (grid.height - 2) / SIZE;
  const out = [];
  for (let ti = 0; ti < across; ti += 1) {
    for (let tj = 0; tj < down; tj += 1) {
      // One colour throughout, so the image's colour costs next to nothing
      // and all its bytes go on the shadow.
      const rgba = Buffer.alloc(SIZE * SIZE * 4);
      for (let at = 0; at < rgba.length; at += 4) {
        rgba[at] = 58;
        rgba[at + 1] = 46;
        rgba[at + 2] = 32;
      }
      let any = 0;
      for (let v = 0; v < SIZE; v += 1) {
        const y = 1 + tj * SIZE + v;
        const lat = box.north - (y - 0.5) * deg;
        const dyMetres = deg * 110_574;
        const dxMetres = Math.max(1, deg * 111_320 * Math.cos((lat * Math.PI) / 180));
        for (let u = 0; u < SIZE; u += 1) {
          const x = 1 + ti * SIZE + u;
          const lon = box.west + (x - 0.5) * deg;
          if (lon >= 180 || Math.abs(lat) > 85) continue;
          const e = (dx, dy) => grid.data[(y + dy) * grid.width + x + dx];
          const dzdx =
            ((e(1, -1) + 2 * e(1, 0) + e(1, 1)) - (e(-1, -1) + 2 * e(-1, 0) + e(-1, 1))) /
            (8 * dxMetres);
          const dzdy =
            ((e(-1, 1) + 2 * e(0, 1) + e(1, 1)) - (e(-1, -1) + 2 * e(0, -1) + e(1, -1))) /
            (8 * dyMetres);
          const slope = Math.atan(exaggeration * Math.hypot(dzdx, dzdy));
          // Aspect, measured as the light's azimuth is: clockwise from north,
          // the way the ground faces (downhill). Rows run south, so a rise
          // down the grid is a slope facing north.
          const aspect = Math.atan2(-dzdx, dzdy);
          const lit =
            Math.cos(ZENITH) * Math.cos(slope) +
            Math.sin(ZENITH) * Math.sin(slope) * Math.cos(AZIMUTH - aspect);
          const at = (v * SIZE + u) * 4;
          const strength = lit < FLAT ? Math.min(1, ((FLAT - lit) / FLAT) * 1.6) : 0;
          rgba[at + 3] = Math.round(strength * 255);
          if (rgba[at + 3] > 6) any += 1;
        }
      }
      // A tile of sea, or of ground too flat to shade, is left out.
      if (any < 40) continue;
      const webp = await sharp(rgba, { raw: { width: SIZE, height: SIZE, channels: 4 } })
        .webp({ quality: 50, alphaQuality: 50, effort: 6 })
        .toBuffer();
      out.push([`${level}/${i0 + ti}/${j0 + tj}`, webp]);
    }
  }
  return out;
}

/** The box, in degrees, that a set of tiles of one level covers. */
function spanOf(level, tiles) {
  const t = tileDeg(level);
  const is = tiles.map(([i]) => i);
  const js = tiles.map(([, j]) => j);
  const i0 = Math.min(...is);
  const j0 = Math.min(...js);
  const i1 = Math.max(...is);
  const j1 = Math.max(...js);
  return {
    i0,
    j0,
    box: {
      west: -180 + i0 * t,
      east: -180 + (i1 + 1) * t,
      north: 90 - j0 * t,
      south: 90 - (j1 + 1) * t,
    },
  };
}

export async function buildRelief({ pool, download }) {
  const tiles = [];
  const coverage = {};

  // The world, at level 2, and levels 1 and 0 from it.
  console.log('Relief: the world');
  const world = tilesOver(0, { west: -180, east: 179.99, north: 89.99, south: -60 });
  const worldSpan = spanOf(0, world);
  const worldGrid = await elevations(download, pool, 2, worldSpan.box, LEVELS[2].zoom);
  const grids = [null, null, worldGrid];
  grids[1] = coarsen(worldGrid);
  grids[0] = coarsen(grids[1]);
  for (let level = 0; level <= 2; level += 1) {
    const t = tileDeg(level);
    tiles.push(
      ...(await shadeTiles(
        level,
        grids[level],
        worldSpan.box,
        Math.round((worldSpan.box.west + 180) / t),
        Math.round((90 - worldSpan.box.north) / t),
      )),
    );
  }

  for (const { level, area, name } of [
    { level: 3, area: US, name: 'the United States' },
    { level: 4, area: CALIFORNIA, name: 'California' },
  ]) {
    console.log(`Relief: ${name}`);
    const parents = tilesOver(level - 1, area);
    coverage[level] = parents.map(([i, j]) => `${level - 1}/${i}/${j}`);
    const span = spanOf(level - 1, parents);
    const grid = await elevations(download, pool, level, span.box, LEVELS[level].zoom);
    const t = tileDeg(level);
    tiles.push(
      ...(await shadeTiles(
        level,
        grid,
        span.box,
        Math.round((span.box.west + 180) / t),
        Math.round((90 - span.box.north) / t),
      )),
    );
  }

  // lib/relief.bin: "GCJR", the index's length, the index as JSON, then
  // every tile's WebP one after another.
  const index = {
    size: SIZE,
    levels: LEVELS.map(({ deg }) => deg),
    coverage,
    tiles: {},
  };
  let offset = 0;
  for (const [key, webp] of tiles) {
    index.tiles[key] = [offset, webp.length];
    offset += webp.length;
  }
  const head = Buffer.from(JSON.stringify(index));
  const length = Buffer.alloc(4);
  length.writeUInt32LE(head.length);
  const file = Buffer.concat([Buffer.from('GCJR'), length, head, ...tiles.map(([, webp]) => webp)]);
  writeFileSync(new URL('../lib/relief.bin', import.meta.url), file);
  const perLevel = LEVELS.map((_, level) => tiles.filter(([key]) => key.startsWith(`${level}/`)).length);
  console.log(`lib/relief.bin: ${tiles.length} tiles (${perLevel.join(' / ')}), ${(file.length / 1e6).toFixed(1)} MB`);
}
