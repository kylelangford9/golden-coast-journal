'use client';

import { useEffect, useRef, useState } from 'react';

type Desk = { id: string; name: string; section: string; lastCheckedAt: string | null };
type Status = {
  now: string;
  nextCheckAt: string;
  run: {
    status: string;
    startedAt: string;
    completedAt: string | null;
    feedsSucceeded: number | null;
    feedSources: number | null;
    discovered: number | null;
    drafted: number | null;
  } | null;
  desks: Desk[];
};

const POLL_MS = 5_000;

function ago(from: string | null, now: number) {
  if (!from) return 'not yet';
  const secs = Math.max(0, Math.round((now - Date.parse(from)) / 1000));
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function countdown(to: string | null, now: number) {
  if (!to) return '--:--';
  const secs = Math.max(0, Math.round((Date.parse(to) - now) / 1000));
  return `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
}

/**
 * What the newsroom is doing, as it does it.
 *
 * Everything here is real: the per-desk timestamps are the moment each feed was
 * last polled, and the phase comes from the run ledger. Nothing is simulated,
 * so when the desk says it is checking, it is checking.
 */
export function LiveSourceMonitor({ initialSourceCount }: { initialSourceCount: number }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [flash, setFlash] = useState<string | null>(null);
  const lastRunId = useRef<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function poll() {
      try {
        const res = await fetch('/api/editorial/status', { cache: 'no-store' });
        if (!res.ok) return;
        const data: Status = await res.json();
        if (!alive) return;
        // A newly-started run makes the desks light up in sequence.
        const key = data.run ? `${data.run.startedAt}` : null;
        if (key && key !== lastRunId.current) {
          lastRunId.current = key;
          setFlash(key);
          window.setTimeout(() => setFlash(null), 4_000);
        }
        setStatus(data);
      } catch {
        // A failed poll leaves the last known state on screen rather than
        // blanking a monitor the reader is watching.
      }
    }
    void poll();
    const timer = window.setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const running = status?.run?.status === 'running';
  const desks = status?.desks || [];
  const checked = desks.length || initialSourceCount;

  const freshest = desks
    .map((desk) => (desk.lastCheckedAt ? Date.parse(desk.lastCheckedAt) : 0))
    .sort((a, b) => b - a)[0];

  return (
    <div
      className={`source-monitor${running || flash ? ' is-checking' : ''}`}
      aria-live="polite"
    >
      {/* One line. The desk roster used to be listed out here and it ate most
          of a phone screen before the story even started. */}
      <div className="source-monitor-head">
        <span className="source-monitor-beacon" aria-hidden="true" />
        <strong>{running ? 'Checking' : 'Live'}</strong>
        <span className="source-monitor-count">
          {running
            ? `${status?.run?.feedsSucceeded ?? 0}/${status?.run?.feedSources ?? checked} desks`
            : `${checked} desks · ${ago(freshest ? new Date(freshest).toISOString() : null, now)}`}
        </span>
        <span className="source-monitor-next">
          {running ? 'now' : countdown(status?.nextCheckAt || null, now)}
        </span>
      </div>
    </div>
  );
}
