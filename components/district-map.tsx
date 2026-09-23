'use client';

import { type KeyboardEvent, type MouseEvent, useRef } from 'react';

import { CA_DISTRICTS, CA_DISTRICT_VIEW_BOX } from '@/lib/ca-districts';
import type { PartySide } from '@/lib/races';
import styles from './district-map.module.css';

const FILL = { D: '#2563eb', R: '#dc2626', O: '#7c3aed' } as const;
/** An open seat with no race called yet, or no race on file. */
const NO_SIDE = '#64748b';

/**
 * A district with less room than this, in view box units, is a pixel or so
 * across on the page, so when it is lit a ring marks where it is.
 */
const SMALL = 4;
const RING = 13;

/** How far off the map a tap may land and still pick the nearest district. */
const REACH = 22;

const BY_NUMBER = new Map(CA_DISTRICTS.map((district) => [district.n, district]));
const COUNT = CA_DISTRICTS.length;

export type Seat = { side: PartySide | null; label: string };

/**
 * The 52 districts as one set of radio buttons: each is a district a reader can
 * pick, and the one whose race is on show is lit.
 *
 * The map is too small for a finger to hit a Los Angeles district reliably, so
 * a tap picks the district under it or, just off the coast, the nearest one,
 * and the arrows beside the seat label step on through the districts in
 * number order. The keyboard does the same with the arrow keys.
 */
export function DistrictMap({
  lit,
  seats,
  onPick,
}: {
  lit: number | null;
  seats: ReadonlyMap<number, Seat>;
  onPick: (district: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const focusable = lit ?? CA_DISTRICTS[0].n;
  const shown = lit == null ? undefined : BY_NUMBER.get(lit);

  function pickAt(event: MouseEvent<SVGSVGElement>) {
    const hit = (event.target as Element).closest('[data-district]');
    if (hit) {
      onPick(Number(hit.getAttribute('data-district')));
      return;
    }
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    let nearest: number | null = null;
    let best = REACH;
    for (const district of CA_DISTRICTS) {
      const gap = Math.hypot(district.x - point.x, district.y - point.y) - district.r;
      if (gap < best) {
        best = gap;
        nearest = district.n;
      }
    }
    if (nearest != null) onPick(nearest);
  }

  function step(event: KeyboardEvent<SVGSVGElement>) {
    const from = Number((event.target as Element).getAttribute('data-district')) || focusable;
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (from % COUNT) + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = ((from + COUNT - 2) % COUNT) + 1;
        break;
      case 'Home':
        next = 1;
        break;
      case 'End':
        next = COUNT;
        break;
      case 'Enter':
      case ' ':
        next = from;
        break;
      default:
        return;
    }
    event.preventDefault();
    onPick(next);
    svgRef.current?.querySelector<SVGPathElement>(`[data-district="${next}"]`)?.focus();
  }

  return (
    <svg
      ref={svgRef}
      viewBox={CA_DISTRICT_VIEW_BOX}
      className={`${styles.map}${shown ? ' ' + styles.hasLit : ''}`}
      role="radiogroup"
      tabIndex={-1}
      aria-label="California's congressional districts. Pick one to see its race."
      onClick={pickAt}
      onKeyDown={step}
    >
      {CA_DISTRICTS.map((district) => {
        const seat = seats.get(district.n);
        const side = seat?.side ?? null;
        return (
          <path
            key={district.n}
            d={district.d}
            data-district={district.n}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- an SVG shape cannot be an <input>
            role="radio"
            aria-checked={district.n === lit}
            aria-label={seat?.label ?? `District ${district.n}`}
            tabIndex={district.n === focusable ? 0 : -1}
            className={`${styles.district}${side ? '' : ' ' + styles.noSide}`}
            fill={side ? FILL[side] : NO_SIDE}
          />
        );
      })}
      {shown ? (
        // Drawn over every district so the outline is never under a
        // neighbour; keyed so that it fades in afresh at each change.
        <g key={shown.n} className={styles.glow} aria-hidden="true">
          <path className={styles.halo} d={shown.d} />
          <path className={styles.edge} d={shown.d} />
          {shown.r < SMALL ? (
            <>
              <circle className={styles.halo} cx={shown.x} cy={shown.y} r={RING} />
              <circle className={styles.ring} cx={shown.x} cy={shown.y} r={RING} />
            </>
          ) : null}
        </g>
      ) : null}
    </svg>
  );
}
