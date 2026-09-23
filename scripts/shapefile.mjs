/**
 * Just enough of the shapefile format to read the Census Bureau's TIGER/Line
 * and cartographic boundary files: polygons and lines from the .shp, and
 * their attributes from the .dbf. No dependency, and nothing it cannot read
 * is guessed at: an unexpected shape type throws.
 */
import { readFileSync } from 'node:fs';

const POLYLINE = 3;
const POLYGON = 5;

/**
 * Every record of `base`.shp and `base`.dbf, as
 * { type: 'line' | 'polygon', parts: [[lon, lat], ...][], props }.
 */
export function readShapefile(base) {
  const shp = readFileSync(`${base}.shp`);
  const props = readDbf(readFileSync(`${base}.dbf`));
  const out = [];
  let offset = 100;
  let index = 0;
  while (offset < shp.length) {
    const length = shp.readInt32BE(offset + 4) * 2;
    const start = offset + 8;
    const type = shp.readInt32LE(start);
    if (type !== 0) {
      if (type !== POLYLINE && type !== POLYGON) {
        throw new Error(`${base}.shp: shape type ${type} is not a line or polygon`);
      }
      const numParts = shp.readInt32LE(start + 36);
      const numPoints = shp.readInt32LE(start + 40);
      const partsAt = start + 44;
      const pointsAt = partsAt + numParts * 4;
      const parts = [];
      for (let p = 0; p < numParts; p += 1) {
        const from = shp.readInt32LE(partsAt + p * 4);
        const to = p + 1 < numParts ? shp.readInt32LE(partsAt + (p + 1) * 4) : numPoints;
        const part = [];
        for (let i = from; i < to; i += 1) {
          part.push([shp.readDoubleLE(pointsAt + i * 16), shp.readDoubleLE(pointsAt + i * 16 + 8)]);
        }
        parts.push(part);
      }
      out.push({ type: type === POLYGON ? 'polygon' : 'line', parts, props: props[index] });
    }
    index += 1;
    offset = start + length;
  }
  return out;
}

function readDbf(dbf) {
  const count = dbf.readUInt32LE(4);
  const headerLength = dbf.readUInt16LE(8);
  const recordLength = dbf.readUInt16LE(10);
  const fields = [];
  for (let at = 32; dbf[at] !== 0x0d; at += 32) {
    fields.push({
      name: dbf.toString('latin1', at, at + 11).split('\u0000')[0],
      type: String.fromCharCode(dbf[at + 11]),
      length: dbf[at + 16],
    });
  }
  const rows = [];
  for (let r = 0; r < count; r += 1) {
    let at = headerLength + r * recordLength + 1;
    const row = {};
    for (const field of fields) {
      const raw = dbf.toString('utf8', at, at + field.length).trim();
      row[field.name] = field.type === 'N' || field.type === 'F' ? Number(raw) : raw;
      at += field.length;
    }
    rows.push(row);
  }
  return rows;
}
