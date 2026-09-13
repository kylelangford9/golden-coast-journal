import { NextResponse } from 'next/server';
import { listDevelopingSignals } from '@/lib/repository';

export async function GET() {
  const signals = await listDevelopingSignals(10);
  return NextResponse.json(
    { data: signals, count: signals.length, label: 'Official-source monitor' },
    { headers: { 'cache-control': 'public, max-age=60, stale-while-revalidate=300' } },
  );
}
