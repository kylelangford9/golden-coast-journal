import { NextResponse } from 'next/server';
import { verifyEditorialRequest } from '@/lib/editorial-auth';
import { sendDigestBatch } from '@/lib/newsletter-email';
import { getSupabase, unwrap } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

type ArticlePick = {
  slug: string;
  title: string;
  dek: string | null;
  image_url: string | null;
  section: string | null;
  published_at: string | null;
};

type SubscriberPick = {
  id: string;
  email: string;
  status: string;
};

async function readForceFlag(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get('force') === '1' || url.searchParams.get('force') === 'true') {
    return true;
  }
  if (request.method === 'GET' || request.method === 'HEAD') return false;
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return false;
    const body = (await request.json()) as { force?: unknown };
    return body?.force === true || body?.force === 1 || body?.force === '1';
  } catch {
    return false;
  }
}

async function loadDigestStories(force: boolean): Promise<{
  stories: ArticlePick[];
  mode: 'last_24h' | 'latest_fallback' | 'empty';
}> {
  const db = getSupabase();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const recentCalifornia = unwrap(
    await db
      .from('gcj_articles')
      .select('slug,title,dek,image_url,section,published_at')
      .eq('status', 'published')
      .eq('section', 'California')
      .gte('published_at', since)
      .order('published_at', { ascending: false })
      .limit(10),
    'Unable to load recent California stories',
  ) as ArticlePick[];

  let picks = recentCalifornia;

  if (picks.length < 5) {
    const recentAny = unwrap(
      await db
        .from('gcj_articles')
        .select('slug,title,dek,image_url,section,published_at')
        .eq('status', 'published')
        .gte('published_at', since)
        .order('published_at', { ascending: false })
        .limit(10),
      'Unable to load recent published stories',
    ) as ArticlePick[];
    if (recentAny.length > picks.length) picks = recentAny;
  }

  if (picks.length >= 5) {
    return { stories: picks.slice(0, 10), mode: 'last_24h' };
  }

  if (picks.length === 0 && !force) {
    return { stories: [], mode: 'empty' };
  }

  const latest = unwrap(
    await db
      .from('gcj_articles')
      .select('slug,title,dek,image_url,section,published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(7),
    'Unable to load latest published stories',
  ) as ArticlePick[];

  if (latest.length === 0) return { stories: [], mode: 'empty' };
  return { stories: latest, mode: 'latest_fallback' };
}

async function handle(request: Request) {
  const auth = await verifyEditorialRequest(request);
  if (auth === 'unconfigured') {
    return NextResponse.json(
      { error: 'Newsletter send is not configured' },
      { status: 503 },
    );
  }
  if (auth !== 'authorized') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const force = await readForceFlag(request);
    const { stories, mode } = await loadDigestStories(force);

    if (stories.length === 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'No published stories available for digest',
        force,
        mode,
        subscribers: 0,
        sent: 0,
        failed: 0,
      });
    }

    const subscribers = unwrap(
      await getSupabase()
        .from('gcj_subscribers')
        .select('id,email,status')
        .in('status', ['confirmed', 'active']),
      'Unable to load newsletter subscribers',
    ) as SubscriberPick[];

    if (subscribers.length === 0) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'No confirmed subscribers',
        force,
        mode,
        storyCount: stories.length,
        subscribers: 0,
        sent: 0,
        failed: 0,
      });
    }

    const delivery = await sendDigestBatch({
      subscribers: subscribers.map((row) => ({ id: row.id, email: row.email })),
      stories,
    });

    console.log(
      JSON.stringify({
        level: 'info',
        message: 'Newsletter digest send finished',
        route: '/api/newsletter/send',
        force,
        mode,
        story_count: stories.length,
        subscribers: subscribers.length,
        sent: delivery.sent,
        failed: delivery.failed,
        subject: delivery.subject,
      }),
    );

    return NextResponse.json({
      ok: true,
      skipped: false,
      force,
      mode,
      subject: delivery.subject,
      storyCount: stories.length,
      stories: stories.map((story) => ({
        slug: story.slug,
        title: story.title,
        published_at: story.published_at,
      })),
      subscribers: subscribers.length,
      sent: delivery.sent,
      failed: delivery.failed,
      results: delivery.results,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        message: 'Newsletter digest send failed',
        route: '/api/newsletter/send',
        error: error instanceof Error ? error.message : 'unknown',
      }),
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Digest send failed' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
