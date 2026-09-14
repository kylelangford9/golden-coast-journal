'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, ExternalLink } from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { Button } from '@/components/ui/button';
import type {
  CaliforniaDeadline,
  DeadlineCategory,
} from '@/lib/california-deadlines';
import { trackPortfolioGrowth } from '@/lib/growth-client';

const filters: Array<'All' | DeadlineCategory> = [
  'All',
  'Elections',
  'Taxes',
  'Workplace',
];

function trackOnce(eventName: string, analyticsName: string) {
  const key = `gcj_${eventName}_california_deadlines`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
  } catch {
    // The deadline utility remains available without browser storage.
  }
  const metadata = { surface: 'california_deadlines' };
  track(analyticsName, metadata);
  trackPortfolioGrowth(eventName, metadata);
}

function dateValue(date: string) {
  return Date.parse(`${date}T12:00:00-07:00`);
}

function countdown(date: string, today: string) {
  const days = Math.round((dateValue(date) - dateValue(today)) / 86_400_000);
  if (days < 0) return 'Passed';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
}

function formattedDate(date: string, endDate?: string) {
  const format = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'America/Los_Angeles',
    }).format(new Date(`${value}T12:00:00-07:00`));
  return endDate ? `${format(date)} to ${format(endDate)}` : format(date);
}

export function DeadlineTracker({
  deadlines,
  today,
}: {
  deadlines: CaliforniaDeadline[];
  today: string;
}) {
  const [filter, setFilter] = useState<(typeof filters)[number]>('All');
  const visible = useMemo(
    () =>
      deadlines.filter(
        (deadline) => filter === 'All' || deadline.category === filter,
      ),
    [deadlines, filter],
  );
  const next = deadlines.find((deadline) => dateValue(deadline.date) >= dateValue(today));

  useEffect(() => {
    trackOnce('deadline_tracker_opened', 'Deadline Tracker Opened');
  }, []);

  function selectFilter(value: (typeof filters)[number]) {
    setFilter(value);
    const metadata = {
      surface: 'california_deadlines',
      category: value.toLowerCase(),
    };
    track('Deadline Filter Selected', metadata);
    trackPortfolioGrowth('deadline_filter_selected', metadata);
  }

  function recordSource(deadlineId: string) {
    const metadata = {
      surface: 'california_deadlines',
      deadline_id: deadlineId,
    };
    track('Deadline Source Opened', metadata);
    trackPortfolioGrowth('deadline_source_opened', metadata);
  }

  function recordCalendar() {
    trackOnce('deadline_calendar_downloaded', 'Deadline Calendar Downloaded');
  }

  function recordNewsletter() {
    trackOnce('deadline_newsletter_selected', 'Deadline Newsletter Selected');
  }

  return (
    <section className="deadline-tracker" aria-labelledby="deadline-tracker-title">
      <div className="deadline-tracker-bar">
        <div>
          <p className="eyebrow">Next on the calendar</p>
          <strong>{next ? formattedDate(next.date) : 'No remaining dates'}</strong>
          <span>{next?.title}</span>
        </div>
        <a
          href="/calendar/california-deadlines.ics"
          download
          onClick={recordCalendar}
        >
          <CalendarPlus aria-hidden="true" /> Add all dates
        </a>
      </div>

      <div className="deadline-filter" aria-label="Filter California deadlines">
        {filters.map((item) => (
          <Button
            key={item}
            type="button"
            variant="outline"
            aria-pressed={filter === item}
            onClick={() => selectFilter(item)}
          >
            {item}
          </Button>
        ))}
      </div>

      <h2 id="deadline-tracker-title" className="visually-hidden">
        Current California deadlines
      </h2>
      <ol className="deadline-list">
        {visible.map((deadline) => (
          <li id={deadline.id} key={deadline.id}>
            <div className="deadline-date">
              <span>{countdown(deadline.date, today)}</span>
              <time dateTime={deadline.date}>
                {formattedDate(deadline.date, deadline.endDate)}
              </time>
            </div>
            <div className="deadline-copy">
              <p className="eyebrow">
                {deadline.category}; {deadline.kind}
              </p>
              <h3>{deadline.title}</h3>
              <p>{deadline.summary}</p>
              <p className="deadline-action">
                <strong>What to do:</strong> {deadline.action}
              </p>
              <div className="deadline-links">
                {deadline.sources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => recordSource(deadline.id)}
                  >
                    Official source <ExternalLink aria-hidden="true" />
                    <span className="visually-hidden">: {source.name}</span>
                  </a>
                ))}
                {deadline.journalHref && (
                  <Link href={deadline.journalHref}>Journal explainer</Link>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="deadline-tracker-cta">
        <p>
          Dates can change for specific taxpayers, counties and individual
          circumstances; use the linked agency record before acting.
        </p>
        <a href="#newsletter" onClick={recordNewsletter}>
          Get the Journal briefing
        </a>
      </div>
    </section>
  );
}
