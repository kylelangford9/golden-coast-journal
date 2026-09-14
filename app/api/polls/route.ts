import { NextResponse } from 'next/server';
import { findReaderPoll } from '@/lib/polls';
import { getReaderPollResults } from '@/lib/poll-server';
import { getSupabase, unwrap } from '@/lib/supabase-server';

const voterTokenPattern = /^[a-f0-9-]{20,80}$/i;

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function rateLimited(request: Request) {
  const address = (
    request.headers.get('x-vercel-forwarded-for') ||
    request.headers.get('x-forwarded-for') ||
    request.headers.get('cf-connecting-ip') ||
    'local'
  )
    .split(',')[0]
    .trim();
  const key = await sha256(`poll-rate:${address}`);
  const result = unwrap(
    await getSupabase().rpc('gcj_consume_rate_limit', {
      p_key: `poll:${key.slice(0, 24)}`,
      p_window_start: Math.floor(Date.now() / 60000),
      p_limit: 10,
    }),
    'Unable to check the poll request rate',
  );
  return result === true;
}

async function pollResponse(pollId: string) {
  const results = await getReaderPollResults();
  return results.find((poll) => poll.id === pollId);
}

function logRequest(
  level: 'info' | 'error',
  request: Request,
  startedAt: number,
  status: number,
) {
  const entry = JSON.stringify({
    level,
    message: level === 'error' ? 'Poll request failed' : 'Poll request completed',
    route: '/api/polls',
    method: request.method,
    status,
    duration_ms: Date.now() - startedAt,
    request_id: request.headers.get('x-vercel-id'),
  });
  if (level === 'error') console.error(entry);
  else console.log(entry);
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  try {
    const polls = await getReaderPollResults();
    logRequest('info', request, startedAt, 200);
    return NextResponse.json(
      { polls },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch {
    logRequest('error', request, startedAt, 503);
    return NextResponse.json(
      { error: 'Reader poll results are unavailable' },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 2048) {
      logRequest('info', request, startedAt, 413);
      return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    }
    if (await rateLimited(request)) {
      logRequest('info', request, startedAt, 429);
      return NextResponse.json(
        { error: 'Too many poll requests' },
        { status: 429, headers: { 'retry-after': '60' } },
      );
    }

    const body = (await request.json()) as {
      pollId?: unknown;
      optionId?: unknown;
      voterToken?: unknown;
    };
    const pollId = typeof body.pollId === 'string' ? body.pollId : '';
    const optionId = typeof body.optionId === 'string' ? body.optionId : '';
    const voterToken =
      typeof body.voterToken === 'string' ? body.voterToken : '';
    const poll = findReaderPoll(pollId);
    if (
      !poll ||
      !poll.options.some((option) => option.id === optionId) ||
      !voterTokenPattern.test(voterToken)
    ) {
      logRequest('info', request, startedAt, 400);
      return NextResponse.json(
        { error: 'Invalid poll response' },
        { status: 400 },
      );
    }

    const serverSecret = process.env.CRON_SECRET;
    if (!serverSecret) throw new Error('Poll storage is not configured');
    const voterHash = await sha256(`${pollId}:${voterToken}:${serverSecret}`);
    const insert = await getSupabase().from('gcj_poll_votes').insert({
      id: crypto.randomUUID(),
      poll_id: pollId,
      option_id: optionId,
      voter_hash: voterHash,
      created_at: new Date().toISOString(),
    });
    if (insert.error && insert.error.code !== '23505') {
      throw new Error(insert.error.message);
    }
    const accepted = !insert.error;
    logRequest('info', request, startedAt, accepted ? 201 : 200);
    return NextResponse.json(
      { accepted, poll: await pollResponse(pollId) },
      { status: accepted ? 201 : 200 },
    );
  } catch {
    logRequest('error', request, startedAt, 503);
    return NextResponse.json(
      { error: 'Reader polling is unavailable' },
      { status: 503 },
    );
  }
}
