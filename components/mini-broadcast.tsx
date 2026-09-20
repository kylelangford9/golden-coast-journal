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
const PULL_LIMIT = 300;
const STOW_SCROLL = 320;

/**
 * A small broadcast monitor carrying the Journal's own stories.
 *
 * It never says it is live; it simply runs. The picture cuts on its own and a
 * tally light blinks. Tapping the screen opens whatever is showing.
 *
 * It starts stowed. Pulling the remote down grows the set in place from the
 * compact strip into a square, with the picture across the top and the
 * headline under it. Pushing the remote back up, or scrolling on, stows it.
 * Full size the channel keys appear and the reader changes story themselves. The remote is a button underneath the
 * gesture, so a keyboard and a screen reader get the same control without
 * needing to drag anything.
 */
export function MiniBroadcast({ items }: { items: BroadcastItem[] }) {
  const [index, setIndex] = useState(0);
  const [cutting, setCutting] = useState(false);
  const [open, setOpen] = useState(false);
  // The set is on when you arrive; switching it off is the reader's choice.
  const [powered, setPowered] = useState(true);
  const [drag, setDrag] = useState(0);
  const grab = useRef<number | null>(null);
  // A touch drag still fires a click on the same element afterwards. Without
  // this the pull set `open`, the click that followed unset it, and the set
  // never grew however hard you pulled.
  const dragged = useRef(false);

  const cut = useCallback(
    (step: 1 | -1) => {
      if (items.length < 2) return;
      setCutting(true);
      window.setTimeout(() => {
        setIndex(
          (current) =>
            (current + (step === 1 ? 1 : items.length - 1)) % items.length,
        );
        setCutting(false);
      }, 150);
    },
    [items.length],
  );

  // Stowed, the set runs itself. Full size it does not: the reader is looking
  // at one story, and having it cut away mid-headline would be a nuisance.
  // That is what the channel keys are for.
  useEffect(() => {
    if (items.length < 2 || !powered || open) return;
    const timer = window.setInterval(() => cut(1), DWELL_MS);
    return () => window.clearInterval(timer);
  }, [cut, items.length, open, powered]);

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
    // The dock holds the space the set leaves behind when it lifts off, so
    // pulling the remote never shoves the front page around.
    <div className={styles.dock}>
    <div className={`${styles.broadcast}${open ? ' ' + styles.isOpen : ''}${powered ? '' : ' ' + styles.isOff}`}>
      <div className={styles.broadcastSet}>
        {powered ? (
        <Link
          href={item.href}
          className={`${styles.broadcastScreen}${cutting ? ' ' + styles.isCutting : ''}`}
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
              // Sized for the pulled-out screen, not the stowed one. At 40vw
              // the browser fetched a 150px file and then had to stretch it
              // across a full-size set, which came out as a dark smear.
              sizes="(max-width: 760px) 65vw, 1100px"
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
      <div
        className={styles.remote}
        // A custom property rather than a transform, so the open state can
        // centre the handset and still follow the finger.
        style={{ '--drag': `${drag}px` } as React.CSSProperties}
      >
        <button
          type="button"
          className={`${styles.remotePower}${powered ? ' ' + styles.isOn : ''}`}
          aria-pressed={powered}
          aria-label={powered ? 'Switch the screen off' : 'Switch the screen on'}
          title={powered ? 'Off' : 'On'}
          onClick={() => setPowered((v) => !v)}
        />


        {/* The transport keys stay put in every state, including when the set
            is switched off, where they go disabled rather than disappearing.
            Keys vanishing resized the whole unit under the reader. */}
        {items.length > 1 ? (
          <div className={styles.remoteRow}>
            <button
              type="button"
              className={`${styles.remoteChannel} ${styles.isPrev}`}
              aria-label="Previous story"
              disabled={!powered}
              onClick={() => cut(-1)}
            >
              <span className={styles.keyGlyph} aria-hidden="true">
                &#9668;&#9668;
              </span>
              {open ? (
                <span className={styles.keyLabel} aria-hidden="true">
                  Prev
                </span>
              ) : null}
            </button>
            <button
              type="button"
              className={`${styles.remoteChannel} ${styles.isNext}`}
              aria-label="Next story"
              disabled={!powered}
              onClick={() => cut(1)}
            >
              <span className={styles.keyGlyph} aria-hidden="true">
                &#9658;&#9658;
              </span>
              {open ? (
                <span className={styles.keyLabel} aria-hidden="true">
                  Next
                </span>
              ) : null}
            </button>
          </div>
        ) : null}

        <button
          type="button"
          className={styles.remoteGrip}
          aria-expanded={open}
          aria-label={open ? 'Shrink the screen' : 'Grow the screen'}
          title={open ? 'Return' : 'Drag down to grow'}
          onClick={() => {
            if (dragged.current) {
              dragged.current = false;
              return;
            }
            setOpen((v) => !v);
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            grab.current = event.clientY;
            dragged.current = false;
          }}
          onPointerMove={(event) => {
            if (grab.current === null) return;
            const dy = event.clientY - grab.current;
            // Above a sloppy tap's wobble, so tapping still toggles.
            if (Math.abs(dy) > 10) dragged.current = true;
            // The handset follows the finger the whole way, in the direction
            // that would do something. Pulling down carries it off the set
            // and out into the middle of the screen; pushing up puts it back.
            setDrag(
              open
                ? Math.min(0, Math.max(-PULL_LIMIT, dy))
                : Math.max(0, Math.min(PULL_LIMIT, dy)),
            );
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
          <span className={styles.keyGlyph} aria-hidden="true">
            {open ? '⌃' : '⌄'}
          </span>
          {open ? (
            <span className={styles.keyLabel} aria-hidden="true">
              Return
            </span>
          ) : null}
        </button>

        <span className={styles.remoteCount} aria-hidden="true">
          {powered ? `${index + 1}/${items.length}` : 'off'}
        </span>
      </div>
    </div>
    </div>
  );
}
