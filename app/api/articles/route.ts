import { NextResponse } from 'next/server';
import { listPublished } from '@/lib/repository';

export async function GET() {
  const stories = await listPublished();
  return NextResponse.json({ data: stories, count: stories.length }, { headers: { 'cache-control': 'public, max-age=60, stale-while-revalidate=300' } });
}
