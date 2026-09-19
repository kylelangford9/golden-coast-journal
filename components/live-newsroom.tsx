'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Pause,
  Play,
  RefreshCw,
} from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { Button } from '@/components/ui/button';
import { trackPortfolioGrowth } from '@/lib/growth-client';

export type LiveNewsStory = {
  id: string;
  kind: 'journal' | 'official-source';
  title: string;
  dek: string;
  href: string;
  section: string;
  source: string;
  publishedAt: string;
  imageUrl: string;
  imageAlt: string;
  imageCredit: string;
};

type LiveNewsroomProps = {
  stories: LiveNewsStory[];
  updatedAt: string;
  sourceCount: number;
};

function trackOnce(eventName: string, analyticsName: string) {
  const key = `gcj_${eventName}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
  } catch {
    // The live desk remains usable when browser storage is unavailable.
  }
  const metadata = { surface: 'live_newsroom' };
  track(analyticsName, metadata);
  trackPortfolioGrowth(eventName, metadata);
}

export function LiveNewsroom({
  stories,
  updatedAt,
  sourceCount,
}: LiveNewsroomProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [isRefreshing, startRefresh] = useTransition();
  const current = stories[currentIndex % Math.max(stories.length, 1)];

  useEffect(() => {
    trackOnce('live_desk_opened', 'Live Desk Opened');
  }, []);

  useEffect(() => {
    if (!playing || stories.length < 2) return;
    const timer = window.setInterval(
      () => setCurrentIndex((index) => (index + 1) % stories.length),
      12_000,
    );
    return () => window.clearInterval(timer);
  }, [playing, stories.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      startRefresh(() => router.refresh());
    }, 300_000);
    return () => window.clearInterval(timer);
  }, [router]);

  if (!current) {
    return <p className="live-newsroom-empty">The source monitor is refreshing.</p>;
  }

  function chooseStory(index: number) {
    setCurrentIndex(index);
    setPlaying(false);
    trackOnce('live_story_selected', 'Live Story Selected');
  }

  function refresh() {
    trackOnce('live_refresh_requested', 'Live Refresh Requested');
    startRefresh(() => router.refresh());
  }

  return (
    <section className="live-newsroom" aria-labelledby="live-newsroom-title">
      <div className="live-newsroom-status">
        <span className="live-newsroom-beacon" aria-hidden="true" />
        <strong>Live source monitor</strong>
        <span>{sourceCount} official desks checked</span>
        <span>
          Updated{' '}
          {new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'America/Los_Angeles',
          }).format(new Date(updatedAt))}{' '}
          PT
        </span>
      </div>

      <div className="live-newsroom-stage">
        <div className="live-newsroom-story">
          <figure className="live-newsroom-visual photo-frame ratio-hero">
            <Image
              key={current.imageUrl}
              src={current.imageUrl}
              alt={current.imageAlt}
              fill
              sizes="(max-width: 760px) 100vw, 640px"
              priority
            />
            <figcaption className="photo-caption">
              Photograph · {current.imageCredit}
            </figcaption>
          </figure>
          <p className="eyebrow">
            {current.section}; {current.source}
          </p>
          <h1 id="live-newsroom-title">{current.title}</h1>
          <p>{current.dek}</p>
          {current.kind === 'journal' ? (
            <Link className="live-newsroom-read" href={current.href}>
              Read the Journal report <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <a
              className="live-newsroom-read"
              href={current.href}
              target="_blank"
              rel="noreferrer"
            >
              Review the official source <ExternalLink aria-hidden="true" />
            </a>
          )}
        </div>

        <div className="live-newsroom-controls" aria-label="Live desk controls">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Previous story"
            onClick={() =>
              chooseStory((currentIndex - 1 + stories.length) % stories.length)
            }
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label={playing ? 'Pause story rotation' : 'Play story rotation'}
            onClick={() => setPlaying((value) => !value)}
          >
            {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Next story"
            onClick={() => chooseStory((currentIndex + 1) % stories.length)}
          >
            <ArrowRight aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            className="live-refresh-button"
            disabled={isRefreshing}
            onClick={refresh}
          >
            <RefreshCw aria-hidden="true" />
            {isRefreshing ? 'Checking' : 'Check now'}
          </Button>
        </div>
      </div>

      <ol className="live-newsroom-queue" aria-label="Current story queue">
        {stories.map((story, index) => (
          <li key={story.id}>
            <button
              type="button"
              aria-current={index === currentIndex ? 'true' : undefined}
              onClick={() => chooseStory(index)}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span className="live-queue-thumb photo-frame">
                <Image
                  src={story.imageUrl}
                  alt=""
                  fill
                  sizes="86px"
                  loading="lazy"
                />
              </span>
              <span>
                <strong>{story.title}</strong>
                <small>
                  {story.kind === 'journal' ? 'Journal report' : 'Official source'};{' '}
                  {story.section}
                </small>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <p className="live-newsroom-disclosure">
        Official-source signals are leads for readers and the newsroom; they are
        not finished Journal reporting. The desk checks for new items every five
        minutes and links to the original source.
      </p>
    </section>
  );
}
