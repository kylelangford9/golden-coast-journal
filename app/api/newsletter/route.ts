import { NextResponse } from 'next/server';
import { getSupabase, unwrap } from '@/lib/supabase-server';

async function rateLimited(request: Request) {
  const address = (
    request.headers.get('x-vercel-forwarded-for') ||
    request.headers.get('x-forwarded-for') ||
    request.headers.get('cf-connecting-ip') ||
    'local'
  )
    .split(',')[0]
    .trim();
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(address),
  );
  const key = Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const result = unwrap(
    await getSupabase().rpc('gcj_consume_rate_limit', {
      p_key: key,
      p_window_start: Math.floor(Date.now() / 60000),
      p_limit: 5,
    }),
    'Unable to check the request rate',
  );
  return result === true;
}

export async function POST(request: Request) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 2048)
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    if (await rateLimited(request)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'retry-after': '60' } },
      );
    }
    const body = (await request.json()) as {
      email?: unknown;
      website?: unknown;
    };
    if (body.website) return NextResponse.json({ ok: true }, { status: 201 });
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json(
        { error: 'Enter a valid email address' },
        { status: 400 },
      );
    }
    const result = unwrap(
      await getSupabase()
        .from('gcj_subscribers')
        .upsert(
          {
            id: crypto.randomUUID(),
            email,
            status: 'pending',
            created_at: new Date().toISOString(),
          },
          { onConflict: 'email', ignoreDuplicates: true },
        )
        .select('id')
        .maybeSingle(),
      'Unable to add subscriber',
    );
    return NextResponse.json(
      { ok: true, created: Boolean(result) },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: 'Subscription service is unavailable' },
      { status: 503 },
    );
  }
}
