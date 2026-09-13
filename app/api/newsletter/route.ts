import { NextResponse } from 'next/server';
import { getDb } from '@/db';
import { requestLimits, subscribers } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

async function rateLimited(request: Request) {
  const address = request.headers.get('cf-connecting-ip') || 'local';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(address));
  const key = Array.from(new Uint8Array(digest)).slice(0, 12).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const windowStart = Math.floor(Date.now() / 60000);
  const db = getDb();
  await db.insert(requestLimits).values({ key, count: 1, windowStart }).onConflictDoUpdate({
    target: requestLimits.key,
    set: {
      count: sql`case when ${requestLimits.windowStart} = ${windowStart} then ${requestLimits.count} + 1 else 1 end`,
      windowStart,
    },
  });
  const [record] = await db.select().from(requestLimits).where(eq(requestLimits.key, key)).limit(1);
  return record.windowStart === windowStart && record.count > 5;
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 2048) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    if (await rateLimited(request)) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'retry-after': '60' } });
    const body = await request.json() as { email?: unknown; website?: unknown };
    if (body.website) return NextResponse.json({ ok: true }, { status: 201 });
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
    }
    await getDb().insert(subscribers).values({ id: crypto.randomUUID(), email, status: 'pending', createdAt: new Date().toISOString() }).onConflictDoNothing();
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Subscription service is unavailable' }, { status: 503 });
  }
}
