'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

export type BroadcastItem = {
  title: string;
  href: string;
  section: string;
  imageUrl: string;
};

const DWELL_MS = 6_000;
const PULL_TRIGGER = 26;

/**
 * A small broadcast monitor carrying the Journal's own stories.
 *
 * It never says it is live; it simply runs. The picture cuts from one story to
 * the next on its own, a tally light blinks, and the screen carries scan lines
 * and the glow of something switched on.
 *
 * The screen is a link to whatever is showing. Beside it is a remote whose
 * handle can be pulled down to change the story; the pull is an enhancement
 * over a plain button, so a keyboard or a screen reader gets the same control
 * without needing the gesture.
 */
export function MiniBroadcast({ items }: { items: BroadcastItem[] }) {
  const [index, setIndex] = useState(0);
  const [cutting, setCutting] = useState(false);
  const [pull, setPull] = useState(0);
  const grab = useRef<number | null>(null);
  const paused = useRef(false);

  const advance = useCallback(() => {
    if (items.length < 2) return;
    setCutting(true);
    window.setTimeout(() => {
      setIndex((current) => (current + 1) % items.length);
      setCutting(false);
    }, 150);
  }, [items.length]);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => {
      if (!paused.current) advance();
    }, DWELL_MS);
    return () => window.clearInterval(timer);
  }, [advance, items.length]);

  if (!items.length) return null;
  const item = items[index];

  return (
    <div className="broadcast">
      <div className="broadcast-set">
        <Link
          href={item.href}
          className="broadcast-screen"
          aria-label={`${item.title}; open this story`}
        >
          <span className="broadcast-tally" aria-hidden="true" />
          <span className="broadcast-still">
            <Image
              key={item.imageUrl}
              src={item.imageUrl}
              alt=""
              fill
              sizes="72px"
            />
          </span>
          <span className={`broadcast-copy${cutting ? ' is-cutting' : ''}`}>
            <span className="broadcast-slug">{item.section}</span>
            <span className="broadcast-line">{item.title}</span>
          </span>
          <span className="broadcast-scan" aria-hidden="true" />
        </Link>
      </div>

      <div className="broadcast-remote">
        <button
          type="button"
          className="broadcast-knob"
          aria-label="Next story"
          title="Pull down for the next story"
          style={{ transform: `translateY(${pull}px)` }}
          onClick={advance}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            grab.current = event.clientY;
            paused.current = true;
          }}
          onPointerMove={(event) => {
            if (grab.current === null) return;
            setPull(Math.max(0, Math.min(PULL_TRIGGER + 6, event.clientY - grab.current)));
          }}
          onPointerUp={() => {
            const pulled = pull >= PULL_TRIGGER;
            grab.current = null;
            paused.current = false;
            setPull(0);
            // A click fires on its own when the handle has not moved, so only
            // a real pull advances here; otherwise the story would skip twice.
            if (pulled) advance();
          }}
          onPointerCancel={() => {
            grab.current = null;
            paused.current = false;
            setPull(0);
          }}
        >
          <span className="broadcast-knob-grip" aria-hidden="true" />
        </button>
        <span className="broadcast-count" aria-hidden="true">
          {index + 1}/{items.length}
        </span>
      </div>
    </div>
  );
}
