import { NextResponse } from 'next/server';
import { NO_STORE, baseMap, countyShapes, labelTowns } from '@/lib/near-me-data';
import { drawRegion, WORLD, type Rect } from '@/lib/near-me-map';

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/**
 * More of the News near Me map, for the part of the world the reader has
 * moved it to, at the detail that part needs. The area arrives in the body
 * of a POST, so it is in no request log, and it is used to draw this one
 * response and not kept.
 *
 * The request is bounded: no wider than the world, and no finer than about
 * four thousand points across, so one call cannot ask for more drawing than
 * a screen can show.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid();
  }
  const { projection, bounds, tolerance, highlight } = (
    body && typeof body === 'object' ? body : {}
  ) as {
    projection?: { lon0?: unknown; cos?: unknown };
    bounds?: Partial<Record<keyof Rect, unknown>>;
    tolerance?: unknown;
    highlight?: unknown;
  };
  const lon0 = projection?.lon0;
  const cos = projection?.cos;
  if (!finite(lon0) || !finite(cos) || Math.abs(lon0) > 180 || cos < 0.2 || cos > 1) {
    return invalid();
  }
  const { x, y, w, h } = bounds || {};
  if (!finite(x) || !finite(y) || !finite(w) || !finite(h) || w <= 0 || h <= 0) {
    return invalid();
  }
  const area: Rect = {
    x: Math.max(-360 * WORLD, x),
    y: Math.max(-90 * WORLD, y),
    w: Math.min(720 * WORLD, w),
    h: Math.min(180 * WORLD, h),
  };
  const detail = Math.max(0.5, area.w / 4000, finite(tolerance) ? tolerance : 0);
  const counties = Array.isArray(highlight)
    ? highlight.filter((key): key is string => typeof key === 'string' && /^CA\.\d{3}$/.test(key)).slice(0, 58)
    : [];

  return NextResponse.json(
    drawRegion(baseMap, countyShapes, { lon0, cos }, area, detail, counties, labelTowns),
    { headers: NO_STORE },
  );
}

function invalid() {
  return NextResponse.json(
    { error: 'Send { projection, bounds, tolerance }.' },
    { status: 400, headers: NO_STORE },
  );
}
