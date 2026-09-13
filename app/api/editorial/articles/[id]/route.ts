import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { articles, editorialActions } from '@/db/schema';
import { verifyEditorialRequest } from '@/lib/editorial-auth';

type ActionRouteProps = { params: Promise<{ id: string }> };
type EditorialAction = 'publish' | 'reject' | 'reopen';

export async function POST(request: Request, { params }: ActionRouteProps) {
  const auth = await verifyEditorialRequest(request);
  if (auth === 'unconfigured') return NextResponse.json({ error: 'Editorial automation is not configured' }, { status: 503 });
  if (auth !== 'authorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4096) return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });

  const { id } = await params;
  if (!/^[a-zA-Z0-9-]{1,128}$/.test(id)) return NextResponse.json({ error: 'Invalid article id' }, { status: 400 });

  let payload: { action?: EditorialAction; note?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload.action || !['publish', 'reject', 'reopen'].includes(payload.action)) {
    return NextResponse.json({ error: 'Action must be publish, reject or reopen' }, { status: 400 });
  }
  const note = typeof payload.note === 'string' ? payload.note.trim().slice(0, 500) : '';
  const db = getDb();
  const [article] = await db.select({ id: articles.id, status: articles.status, publishedAt: articles.publishedAt }).from(articles).where(eq(articles.id, id)).limit(1);
  if (!article) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  const now = new Date().toISOString();
  const nextStatus = payload.action === 'publish' ? 'published' : payload.action === 'reject' ? 'archived' : 'review';
  const action = payload.action === 'publish' ? 'published' : payload.action === 'reject' ? 'rejected' : 'reopened';
  const publishedAt = nextStatus === 'published' ? (article.publishedAt || now) : null;
  await db.batch([
    db.update(articles).set({ status: nextStatus, publishedAt, updatedAt: now }).where(eq(articles.id, id)),
    db.insert(editorialActions).values({ id: crypto.randomUUID(), articleId: id, action, actor: 'publisher', note: note || null, createdAt: now }),
  ]);

  return NextResponse.json({ id, previousStatus: article.status, status: nextStatus, action, updatedAt: now });
}
