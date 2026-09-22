import { NextResponse } from 'next/server';
import { verifyEditorialRequest } from '@/lib/editorial-auth';
import { getSupabase, unwrap } from '@/lib/supabase-server';
import { notifyWebSubHub } from '@/lib/websub';
import { articleUrl, submitToIndexNow } from '@/lib/indexnow';

type ActionRouteProps = { params: Promise<{ id: string }> };
type EditorialAction = 'publish' | 'reject' | 'reopen';

export async function POST(request: Request, { params }: ActionRouteProps) {
  const auth = await verifyEditorialRequest(request);
  if (auth === 'unconfigured')
    return NextResponse.json(
      { error: 'Editorial automation is not configured' },
      { status: 503 },
    );
  if (auth !== 'authorized')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4096)
    return NextResponse.json(
      { error: 'Request body is too large' },
      { status: 413 },
    );

  const { id } = await params;
  if (!/^[a-zA-Z0-9-]{1,128}$/.test(id))
    return NextResponse.json({ error: 'Invalid article id' }, { status: 400 });

  let payload: { action?: EditorialAction; note?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    !payload.action ||
    !['publish', 'reject', 'reopen'].includes(payload.action)
  ) {
    return NextResponse.json(
      { error: 'Action must be publish, reject or reopen' },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const rows = unwrap(
    await getSupabase().rpc('gcj_apply_editorial_action', {
      p_article_id: id,
      p_action: payload.action,
      p_note:
        typeof payload.note === 'string'
          ? payload.note.trim().slice(0, 500)
          : '',
      p_now: now,
    }),
    'Unable to apply editorial action',
  ) as Array<{
    article_id: string;
    previous_status: string;
    next_status: string;
    recorded_action: string;
    updated_at: string;
  }>;

  const result = rows[0];
  if (!result)
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  const becamePublic =
    result.previous_status !== 'published' && result.next_status === 'published';
  const discoveryNotification = becamePublic ? await notifyWebSubHub() : null;

  // WebSub moves the feed; IndexNow names the individual URL, which is what a
  // search engine needs to crawl a story on the day it runs. The slug is not
  // part of the action result, so read it back rather than reconstruct it.
  let indexNowNotification: Awaited<ReturnType<typeof submitToIndexNow>> | null =
    null;
  if (becamePublic) {
    const rows = unwrap(
      await getSupabase()
        .from('gcj_articles')
        .select('slug')
        .eq('id', result.article_id)
        .limit(1),
      'Unable to read the published slug',
    ) as Array<{ slug: string }>;
    const slug = rows[0]?.slug;
    if (slug) indexNowNotification = await submitToIndexNow([articleUrl(slug)]);
  }

  return NextResponse.json({
    id: result.article_id,
    previousStatus: result.previous_status,
    status: result.next_status,
    action: result.recorded_action,
    updatedAt: result.updated_at,
    discoveryNotification,
    indexNowNotification,
  });
}
