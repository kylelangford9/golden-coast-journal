import { NextResponse } from 'next/server';
import { getSupabase, unwrap } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Public, non-sensitive view of what the newsroom is doing right now: when each
 * desk was last polled, whether a run is in flight, and when the next one is
 * due. It carries no credentials, no subscriber data and no unpublished copy,
 * which is why it needs no bearer token; the reader is meant to watch this.
 */
export async function GET() {
  const db = getSupabase();

  const [sources, runs] = await Promise.all([
    db
      .from('gcj_sources')
      .select('id,name,section,last_fetched_at')
      .eq('active', true)
      .order('name'),
    db
      .from('gcj_pipeline_runs')
      .select('id,status,started_at,completed_at,metrics_json')
      .order('started_at', { ascending: false })
      .limit(1),
  ]);

  const sourceRows =
    (unwrap(sources, 'Unable to load sources') as
      | { id: string; name: string; section: string; last_fetched_at: string | null }[]
      | null) || [];
  const runRows =
    (unwrap(runs, 'Unable to load runs') as
      | {
          id: string;
          status: string;
          started_at: string;
          completed_at: string | null;
          metrics_json: Record<string, unknown> | null;
        }[]
      | null) || [];

  const latest = runRows[0] || null;
  const metrics = (latest?.metrics_json || {}) as Record<string, number | string | boolean>;

  // Vercel Cron fires at seven minutes past each hour.
  const now = new Date();
  const next = new Date(now);
  next.setUTCMinutes(7, 0, 0);
  if (next <= now) next.setUTCHours(next.getUTCHours() + 1);

  return NextResponse.json(
    {
      now: now.toISOString(),
      nextCheckAt: next.toISOString(),
      run: latest
        ? {
            status: latest.status,
            startedAt: latest.started_at,
            completedAt: latest.completed_at,
            durationMs: metrics.durationMs ?? null,
            feedsSucceeded: metrics.feedsSucceeded ?? null,
            feedSources: metrics.feedSources ?? null,
            discovered: metrics.discovered ?? null,
            drafted: metrics.drafted ?? null,
          }
        : null,
      desks: sourceRows.map((row) => ({
        id: row.id,
        name: row.name,
        section: row.section,
        lastCheckedAt: row.last_fetched_at,
      })),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
