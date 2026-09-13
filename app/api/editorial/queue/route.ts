import { NextResponse } from 'next/server';
import { verifyEditorialRequest } from '@/lib/editorial-auth';
import { getSupabase, unwrap } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const auth = await verifyEditorialRequest(request);
  if (auth === 'unconfigured')
    return NextResponse.json(
      { error: 'Editorial automation is not configured' },
      { status: 503 },
    );
  if (auth !== 'authorized')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows =
    unwrap(
      await getSupabase()
        .from('gcj_articles')
        .select(
          'id,slug,section,title,dek,author,sources_json,confidence,created_at,updated_at',
        )
        .eq('status', 'review')
        .order('created_at', { ascending: false })
        .limit(100),
      'Unable to load editorial queue',
    ) || [];

  return NextResponse.json(
    {
      data: rows.map(({ sources_json, created_at, updated_at, ...row }) => ({
        ...row,
        sources: sources_json,
        createdAt: created_at,
        updatedAt: updated_at,
      })),
      count: rows.length,
    },
    { headers: { 'cache-control': 'private, no-store' } },
  );
}
