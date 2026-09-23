'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LoaderCircle, MapPin, X } from 'lucide-react';
import { track } from '@vercel/analytics/react';

type NearCard = {
  slug: string;
  title: string;
  section: string;
  imageUrl: string;
  imageAlt: string;
  where: string;
};

type NearGroup = { id: string; heading: string; stories: NearCard[] };

type NearResult = {
  town: string;
  radius: string;
  groups: NearGroup[];
  hasNear: boolean;
  credit: string;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'loading' }
  | { kind: 'ready'; result: NearResult }
  | { kind: 'error'; message: string };

const MESSAGES = {
  unsupported: 'This browser cannot share a location.',
  denied:
    'Location is turned off for the Journal. Allow it in your browser’s settings, then try again.',
  unavailable: 'Your location could not be found. Try again in a moment.',
  failed: 'The stories near you could not be loaded. Try again in a moment.',
} as const;

// Two decimal places is about a kilometer: enough to name the town, and no
// closer than that leaves the reader's device.
const round = (value: number) => Math.round(value * 100) / 100;

/**
 * News near Me. Nothing is asked for until the reader taps the button; the
 * browser then asks their permission, and the rounded position goes to the
 * Journal's own server once, which names the nearest town and picks the
 * stories set near it.
 */
export function NewsNearMe() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const titleId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);

  // The panel takes the button's place, so focus goes to its heading when it
  // opens and back to the button when it closes; a keyboard or screen-reader
  // user is never left on an element that has gone.
  useEffect(() => {
    if (status.kind === 'ready') heading.current?.focus();
    if (status.kind === 'idle' && closing.current) {
      closing.current = false;
      button.current?.focus();
    }
  }, [status.kind]);

  function fail(reason: keyof typeof MESSAGES) {
    setStatus({ kind: 'error', message: MESSAGES[reason] });
    track('News Near Me', { outcome: reason });
  }

  async function load(lat: number, lon: number) {
    setStatus({ kind: 'loading' });
    try {
      const response = await fetch('/api/near-me', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lat: round(lat), lon: round(lon) }),
      });
      if (!response.ok) throw new Error(`near-me returned ${response.status}`);
      const result = (await response.json()) as NearResult;
      setStatus({ kind: 'ready', result });
      track('News Near Me', {
        outcome: result.hasNear ? 'near' : 'none_near',
      });
    } catch {
      fail('failed');
    }
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      fail('unsupported');
      return;
    }
    setStatus({ kind: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (position) => load(position.coords.latitude, position.coords.longitude),
      (error) => fail(error.code === 1 ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 },
    );
  }

  const busy = status.kind === 'locating' || status.kind === 'loading';

  return (
    <div className="near-me">
      {status.kind === 'ready' ? null : (
        <div className="near-me-bar">
          <button
            ref={button}
            type="button"
            className="near-me-button"
            onClick={locate}
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle className="near-me-spinner" size={15} aria-hidden="true" />
            ) : (
              <MapPin size={15} aria-hidden="true" />
            )}
            {status.kind === 'locating'
              ? 'Finding your location…'
              : status.kind === 'loading'
                ? 'Finding stories…'
                : 'News near Me'}
          </button>
          <output className="near-me-message">
            {status.kind === 'error' ? status.message : ''}
          </output>
        </div>
      )}

      {status.kind === 'ready' ? (
        <section className="near-me-panel" aria-labelledby={titleId}>
          <header className="near-me-head">
            <div>
              <p className="eyebrow">News near me</p>
              <h2 id={titleId} ref={heading} tabIndex={-1}>
                Showing stories near {status.result.town}
              </h2>
            </div>
            <button
              type="button"
              className="near-me-close"
              onClick={() => {
                closing.current = true;
                setStatus({ kind: 'idle' });
              }}
              aria-label="Close stories near you"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          {status.result.hasNear ? null : (
            <p className="near-me-empty">
              Nothing the Journal has published is set within{' '}
              {status.result.radius} of {status.result.town} yet.
            </p>
          )}

          {status.result.groups.map((group) => (
            <div className="near-me-group" key={group.id}>
              <h3>{group.heading}</h3>
              <ol>
                {group.stories.map((story) => (
                  <li key={story.slug}>
                    <Link
                      href={`/article/${story.slug}`}
                      onClick={() =>
                        track('News Near Me Story Selected', {
                          article_slug: story.slug,
                          group: group.id,
                        })
                      }
                    >
                      <span className="near-me-thumb photo-frame">
                        <Image src={story.imageUrl} alt="" fill sizes="88px" />
                      </span>
                      <span className="near-me-copy">
                        <em>{story.where}</em>
                        <strong>{story.title}</strong>
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ))}

          <p className="near-me-note">
            Your location was rounded to about a kilometer, used once to find
            these stories and not stored. {status.result.credit}
          </p>
        </section>
      ) : null}
    </div>
  );
}
