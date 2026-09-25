import { after, NextResponse } from 'next/server';
import { authenticateApiKey } from '@/lib/api-keys';
import { findApiKeyByHash, touchApiKey } from '@/lib/api-key-store';
import { buildEdition } from '@/lib/edition';
import { listPublished } from '@/lib/repository';

/**
 * GET /api/v1/edition: today's paper, laid out by the newsroom.
 *
 * Public. A key is optional and only names the caller (see lib/api-keys.ts).
 * The response is the same for everyone, so it is cached at the edge for five
 * minutes and served stale for a day if the newsroom cannot answer; `Vary`
 * keeps a keyed read from being answered out of an anonymous one's entry, so
 * a revoked key is refused on its next uncached read.
 */

const SITE = (process.env.SITE_URL || 'https://www.goldencoastjournal.com').replace(/\/+$/, '');
const STORIES_CONSIDERED = 60;

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request.headers.get('authorization'), findApiKeyByHash);

  if (auth.status === 'invalid') {
    return NextResponse.json(
      {
        error: {
          code: 'invalid_api_key',
          reason: auth.reason,
          message:
            'This API key is not recognised, has been revoked, or cannot read the edition. Send no Authorization header to read the public edition.',
        },
      },
      {
        status: 401,
        headers: {
          'cache-control': 'no-store',
          'www-authenticate': 'Bearer realm="goldencoastjournal", error="invalid_token"',
        },
      },
    );
  }

  if (auth.status === 'valid') {
    const { id } = auth.key;
    after(() => touchApiKey(id).catch(() => undefined));
  }

  const edition = buildEdition(await listPublished(STORIES_CONSIDERED), { origin: SITE });
  if (!edition) {
    return NextResponse.json(
      { error: { code: 'no_edition', message: 'No published stories are available yet.' } },
      { status: 503, headers: { 'cache-control': 'no-store', 'retry-after': '300' } },
    );
  }

  return NextResponse.json(edition, {
    headers: {
      'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      vary: 'Authorization',
      'access-control-allow-origin': '*',
      'gcj-key-status': auth.status,
    },
  });
}
