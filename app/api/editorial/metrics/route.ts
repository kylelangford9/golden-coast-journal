import { NextResponse } from 'next/server';
import { verifyEditorialRequest } from '@/lib/editorial-auth';
import { getSupabase } from '@/lib/supabase-server';

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
    const [published, review, candidates, subscribers, latest, sections] =
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
        db.from('gcj_subscribers').select('*', { count: 'exact', head: true }),
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
      ]);

    if (latest.error)
      throw new Error(`Latest article: ${latest.error.message}`);
    if (sections.error)
      throw new Error(`Section totals: ${sections.error.message}`);

    const sectionTotals = (sections.data || []).reduce<Record<string, number>>(
      (totals, article) => {
        totals[article.section] = (totals[article.section] || 0) + 1;
        return totals;
      },
      {},
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
            'Newsletter Signup',
            'Newsletter Invite Started',
            'Author Profile Viewed',
          ],
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
