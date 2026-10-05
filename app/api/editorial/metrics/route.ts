import { NextResponse } from 'next/server';
import { verifyEditorialRequest } from '@/lib/editorial-auth';
import { getSupabase } from '@/lib/supabase-server';

type PipelineRun = {
  status: 'running' | 'succeeded' | 'partial' | 'failed';
  started_at: string;
  completed_at: string | null;
  metrics_json: Record<string, unknown>;
  error: string | null;
};

function requireCount(
  result: { count: number | null; error: { message: string } | null },
  label: string,
) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.count || 0;
}

export async function GET(request: Request) {
  const auth = await verifyEditorialRequest(request);
  if (auth === 'unconfigured')
    return NextResponse.json(
      { error: 'Editorial automation is not configured' },
      { status: 503 },
    );
  if (auth !== 'authorized')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const db = getSupabase();
    const [
      published,
      review,
      candidates,
      subscribers,
      latest,
      sections,
      pipelineRuns,
    ] =
      await Promise.all([
        db
          .from('gcj_articles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published'),
        db
          .from('gcj_articles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'review'),
        db
          .from('gcj_story_candidates')
          .select('*', { count: 'exact', head: true }),
        db
          .from('gcj_subscribers')
          .select('*', { count: 'exact', head: true })
          .in('status', ['confirmed', 'active']),
        db
          .from('gcj_articles')
          .select('published_at')
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        db
          .from('gcj_articles')
          .select('section')
          .eq('status', 'published')
          .limit(500),
        db
          .from('gcj_pipeline_runs')
          .select('status,started_at,completed_at,metrics_json,error')
          .order('started_at', { ascending: false })
          .limit(25),
      ]);

    if (latest.error)
      throw new Error(`Latest article: ${latest.error.message}`);
    if (sections.error)
      throw new Error(`Section totals: ${sections.error.message}`);
    if (pipelineRuns.error)
      throw new Error(`Pipeline runs: ${pipelineRuns.error.message}`);

    const sectionTotals = (sections.data || []).reduce<Record<string, number>>(
      (totals, article) => {
        totals[article.section] = (totals[article.section] || 0) + 1;
        return totals;
      },
      {},
    );
    const runs = (pipelineRuns.data || []) as PipelineRun[];
    const latestRun = runs[0] || null;
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60_000;
    const staleRunning = runs.filter(
      (run) =>
        run.status === 'running' &&
        Date.parse(run.started_at) < now - 15 * 60_000,
    ).length;
    const last24Hours = runs.filter(
      (run) => Date.parse(run.started_at) >= oneDayAgo,
    );

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        editorial: {
          published: requireCount(published, 'Published articles'),
          inReview: requireCount(review, 'Review queue'),
          candidates: requireCount(candidates, 'Story candidates'),
          latestPublishedAt: latest.data?.published_at || null,
          sections: sectionTotals,
        },
        audience: {
          subscribers: requireCount(subscribers, 'Subscribers'),
          trackedEvents: [
            'pageview',
            'Network Arrival',
            'Network Referral',
            'Newsletter Form Viewed',
            'Newsletter Intent Started',
            'Newsletter Signup',
            'Newsletter Invite Started',
            'Author Profile Viewed',
          ],
        },
        automation: {
          healthy:
            latestRun?.status === 'succeeded' &&
            staleRunning === 0 &&
            Date.parse(latestRun.started_at) >= now - 2 * 60 * 60_000,
          latestRun: latestRun
            ? {
                status: latestRun.status,
                startedAt: latestRun.started_at,
                completedAt: latestRun.completed_at,
                durationMs: latestRun.completed_at
                  ? Date.parse(latestRun.completed_at) -
                    Date.parse(latestRun.started_at)
                  : null,
                metrics: latestRun.metrics_json,
                error: latestRun.error?.slice(0, 500) || null,
              }
            : null,
          staleRunning,
          last24Hours: {
            total: last24Hours.length,
            succeeded: last24Hours.filter(
              (run) => run.status === 'succeeded',
            ).length,
            partial: last24Hours.filter((run) => run.status === 'partial')
              .length,
            failed: last24Hours.filter((run) => run.status === 'failed')
              .length,
            running: last24Hours.filter((run) => run.status === 'running')
              .length,
          },
        },
      },
      { headers: { 'cache-control': 'private, no-store' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'Unable to load publication metrics' },
      { status: 503 },
    );
  }
}
