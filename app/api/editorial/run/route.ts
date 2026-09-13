import { NextResponse } from 'next/server';
import { runEditorialPipeline } from '@/lib/pipeline';
import { verifyEditorialRequest } from '@/lib/editorial-auth';

export async function POST(request: Request) {
  const auth = await verifyEditorialRequest(request);
  if (auth === 'unconfigured') return NextResponse.json({ error: 'Editorial automation is not configured' }, { status: 503 });
  if (auth !== 'authorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await runEditorialPipeline());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Pipeline failed' }, { status: 500 });
  }
}
