'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import styles from './mini-broadcast.module.css';

export type BroadcastItem = {
  title: string;
  href: string;
  section: string;
  imageUrl: string;
};

const DWELL_MS = 6_000;
const PULL_TRIGGER = 34;
const STOW_SCROLL = 320;

/**
 * A small broadcast monitor carrying the Journal's own stories.
 *
 * It never says it is live; it simply runs. The picture cuts on its own, a
 * tally light blinks, and the screen carries scan lines and the glow of
 * something switched on. Tapping the screen opens whatever is showing.
 *
 * The remote beside it is pulled out to enlarge the set and pushed back to
 * shrink it. Scrolling past the masthead stows it too, so an enlarged screen
 * never follows the reader down the page. It is a button underneath the
 * gesture, so a keyboard and a screen reader get the same control.
 */
export function MiniBroadcast({ items }: { items: BroadcastItem[] }) {
  const [index, setIndex] = useState(0);
  const [cutting, setCutting] = useState(false);
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(0);
  const grab = useRef<number | null>(null);

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
    const timer = window.setInterval(advance, DWELL_MS);
    return () => window.clearInterval(timer);
  }, [advance, items.length]);

  // Reading the page is the signal that the set has been watched enough.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => {
      if (window.scrollY > STOW_SCROLL) setOpen(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [open]);

  if (!items.length) return null;
  const item = items[index];

  return (
    <div className={`broadcast${open ? ' is-open' : ''}`}>
      <div className={styles.broadcastSet}>
        <Link
          href={item.href}
          className={styles.broadcastScreen}
          aria-label={`${item.title}; open this story`}
          // The minifier drops `display` from this rule in the emitted CSS, so
          // the anchor fell back to inline and the screen collapsed to nothing.
          // Everything else in the rule survives; pinning the one property it
          // loses is cheaper than fighting the build.
          style={{ display: 'flex' }}
        >
          <span className={styles.broadcastTally} aria-hidden="true" />
          <span className={styles.broadcastStill}>
            <Image
              key={item.imageUrl}
              src={item.imageUrl}
              alt=""
              fill
              sizes="(max-width: 760px) 40vw, 200px"
            />
          </span>
          <span className={`broadcast-copy${cutting ? ' is-cutting' : ''}`}>
            <span className={styles.broadcastSlug}>{item.section}</span>
            <span className={styles.broadcastLine}>{item.title}</span>
          </span>
          <span className={styles.broadcastScan} aria-hidden="true" />
        </Link>
      </div>

      <button
        type="button"
        className={styles.remote}
        aria-expanded={open}
        aria-label={open ? 'Stow the remote and shrink the screen' : 'Pull the remote out to enlarge the screen'}
        title={open ? 'Push back to shrink' : 'Pull out to enlarge'}
        style={{ transform: `translateX(${drag}px)` }}
        onClick={() => setOpen((v) => !v)}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId);
          grab.current = event.clientX;
        }}
        onPointerMove={(event) => {
          if (grab.current === null) return;
          const dx = event.clientX - grab.current;
          // Out is to the right when stowed, back to the left when open.
          setDrag(open ? Math.min(0, Math.max(-PULL_TRIGGER - 8, dx)) : Math.max(0, Math.min(PULL_TRIGGER + 8, dx)));
        }}
        onPointerUp={() => {
          const moved = Math.abs(drag) >= PULL_TRIGGER;
          grab.current = null;
          setDrag(0);
          // A click fires anyway when the remote has not moved, so only a real
          // pull toggles here; otherwise it would toggle twice and sit still.
          if (moved) setOpen((v) => !v);
        }}
        onPointerCancel={() => {
          grab.current = null;
          setDrag(0);
        }}
      >
        <span className={styles.remoteBody} aria-hidden="true">
          <span className={styles.remoteEye} />
          <span className={styles.remotePower} />
          <span className={styles.remotePad}>
            <i /><i /><i /><i /><i /><i />
          </span>
        </span>
        <span className={styles.remoteCount} aria-hidden="true">
          {index + 1}/{items.length}
        </span>
      </button>
    </div>
  );
}
