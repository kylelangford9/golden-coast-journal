'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

export type BroadcastItem = { title: string; url: string; source: string };

const DWELL_MS = 5_000;

/**
 * A small broadcast monitor in the masthead.
 *
 * It says nothing about being live; it simply runs. Headlines cut from one to
 * the next on their own, a tally light blinks, and the screen carries scan
 * lines and the glow of something switched on. That is the whole argument:
 * show the desk working rather than printing the word "live" next to it.
 */
export function MiniBroadcast({ items }: { items: BroadcastItem[] }) {
  const [index, setIndex] = useState(0);
  const [cutting, setCutting] = useState(false);

  useEffect(() => {
    if (items.length < 2) return;
    const timer = window.setInterval(() => {
      // A short blank between headlines reads as a cut between sources.
      setCutting(true);
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % items.length);
        setCutting(false);
      }, 160);
    }, DWELL_MS);
    return () => window.clearInterval(timer);
  }, [items.length]);

  if (!items.length) return null;
  const item = items[index];

  return (
    <div className="broadcast">
      <div className="broadcast-set">
        <div className="broadcast-screen">
          <span className="broadcast-tally" aria-hidden="true" />
          <p
            className={`broadcast-line${cutting ? ' is-cutting' : ''}`}
            aria-live="polite"
          >
            {item.title}
          </p>
          <span className="broadcast-source" aria-hidden="true">
            {item.source}
          </span>
          <span className="broadcast-scan" aria-hidden="true" />
        </div>
      </div>
      <a
        className="broadcast-link"
        href={item.url}
        target="_blank"
        rel="noreferrer"
        // The label collapses to the icon on a phone, so the name is explicit
        // rather than relying on text the stylesheet has shrunk away.
        aria-label={`Open the official source at ${item.source}`}
      >
        Official source <ExternalLink size={13} aria-hidden="true" />
      </a>
    </div>
  );
}
