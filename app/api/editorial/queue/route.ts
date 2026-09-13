import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { articles } from '@/db/schema';
import { verifyEditorialRequest } from '@/lib/editorial-auth';

export async function GET(request: Request) {
  const auth = await verifyEditorialRequest(request);
  if (auth === 'unconfigured') return NextResponse.json({ error: 'Editorial automation is not configured' }, { status: 503 });
  if (auth !== 'authorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await getDb()
    .select({
      id: articles.id,
      slug: articles.slug,
      section: articles.section,
      title: articles.title,
      dek: articles.dek,
      author: articles.author,
      sourcesJson: articles.sourcesJson,
      confidence: articles.confidence,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
    })
    .from(articles)
    .where(eq(articles.status, 'review'))
    .orderBy(desc(articles.createdAt))
    .limit(100);

  return NextResponse.json({
    data: rows.map(({ sourcesJson, ...row }) => ({ ...row, sources: JSON.parse(sourcesJson) })),
    count: rows.length,
  }, { headers: { 'cache-control': 'private, no-store' } });
}
