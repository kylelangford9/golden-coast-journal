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
 * The remote beside it is dragged down to grow the set into the space below,
 * and pushed back up to shrink it. Scrolling past the masthead stows it too,
 * so an enlarged screen never follows the reader down the page. It is a button
 * underneath the gesture, so a keyboard and a screen reader get the same
 * control without needing to drag anything.
 */
export function MiniBroadcast({ items }: { items: BroadcastItem[] }) {
  const [index, setIndex] = useState(0);
  const [cutting, setCutting] = useState(false);
  const [open, setOpen] = useState(false);
  // The set is on when you arrive; switching it off is the reader's choice.
  const [powered, setPowered] = useState(true);
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
    if (items.length < 2 || !powered) return;
    const timer = window.setInterval(advance, DWELL_MS);
    return () => window.clearInterval(timer);
  }, [advance, items.length, powered]);

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
    <div className={`${styles.broadcast}${open ? ' ' + styles.isOpen : ''}${powered ? '' : ' ' + styles.isOff}`}>
      <div className={styles.broadcastSet}>
        {powered ? (
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
          <span className={`${styles.broadcastCopy}${cutting ? ' ' + styles.isCutting : ''}`}>
            <span className={styles.broadcastSlug}>{item.section}</span>
            <span className={styles.broadcastLine}>{item.title}</span>
          </span>
          <span className={styles.broadcastScan} aria-hidden="true" />
        </Link>
        ) : (
          <div className={styles.broadcastScreen} style={{ display: 'flex' }} aria-hidden="true">
            <span className={styles.broadcastScan} />
          </div>
        )}
      </div>

      {/* A container rather than a button, because the power key lives inside
          it and a button cannot hold another button. */}
      <div className={styles.remote} style={{ transform: `translateY(${drag}px)` }}>
        <span className={styles.remoteEye} aria-hidden="true" />

        <button
          type="button"
          className={`${styles.remotePower}${powered ? ' ' + styles.isOn : ''}`}
          aria-pressed={powered}
          aria-label={powered ? 'Switch the screen off' : 'Switch the screen on'}
          title={powered ? 'Off' : 'On'}
          onClick={() => setPowered((v) => !v)}
        />

        <button
          type="button"
          className={styles.remoteGrip}
          aria-expanded={open}
          aria-label={open ? 'Shrink the screen' : 'Grow the screen'}
          title={open ? 'Push up to shrink' : 'Drag down to grow'}
          disabled={!powered}
          onClick={() => setOpen((v) => !v)}
          onPointerDown={(event) => {
            if (!powered) return;
            event.currentTarget.setPointerCapture?.(event.pointerId);
            grab.current = event.clientY;
          }}
          onPointerMove={(event) => {
            if (grab.current === null) return;
            const dy = event.clientY - grab.current;
            // Down grows the set; up puts it back. The handle follows the
            // finger only in the direction that would do something.
            setDrag(open ? Math.min(0, Math.max(-PULL_TRIGGER - 8, dy)) : Math.max(0, Math.min(PULL_TRIGGER + 8, dy)));
          }}
          onPointerUp={() => {
            const moved = Math.abs(drag) >= PULL_TRIGGER;
            grab.current = null;
            setDrag(0);
            // A click fires anyway when the remote has not moved, so only a
            // real drag toggles here; otherwise it would toggle twice.
            if (moved) setOpen((v) => !v);
          }}
          onPointerCancel={() => {
            grab.current = null;
            setDrag(0);
          }}
        >
          <span aria-hidden="true">{open ? '⌃' : '⌄'}</span>
        </button>

        <span className={styles.remoteCount} aria-hidden="true">
          {powered ? `${index + 1}/${items.length}` : 'off'}
        </span>
      </div>
    </div>
  );
}
