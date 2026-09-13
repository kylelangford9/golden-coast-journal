import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import { runEditorialPipeline } from '@/lib/pipeline';

async function safeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < a.length; index++) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function POST(request: Request) {
  if (!env.CRON_SECRET) return NextResponse.json({ error: 'Editorial automation is not configured' }, { status: 503 });
  const token = request.headers.get('authorization') || '';
  if (!(await safeEqual(token, `Bearer ${env.CRON_SECRET}`))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await runEditorialPipeline());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Pipeline failed' }, { status: 500 });
  }
}
