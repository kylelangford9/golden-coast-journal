import { NextResponse } from 'next/server';
import { findPublishedBySlug } from '@/lib/repository';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await findPublishedBySlug(slug);
  return article ? NextResponse.json({ data: article }) : NextResponse.json({ error: 'Story not found' }, { status: 404 });
}
