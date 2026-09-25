import { journalPhotoSource, PHOTO_CACHE_CONTROL } from '@/lib/edition';

/**
 * GET /media/photos/<path>: a Journal photograph, from the Journal's domain.
 *
 * The edition API hands out these addresses (lib/edition.ts). The bytes come
 * from the storage bucket; the caching comes from here, because the bucket
 * answers `no-cache` and a photograph is the same file for hours at a time.
 * The edge caches this response, so storage is asked once an hour per region
 * rather than once per reader.
 *
 * Only plain photo paths are served, and only if storage says the file is an
 * image, so this cannot be turned into a proxy for anything else on that host.
 */

const NOT_FOUND = { status: 404, headers: { 'cache-control': 'public, max-age=60, s-maxage=300' } };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const source = journalPhotoSource(path);
  if (!source) return new Response('Not found', NOT_FOUND);

  let upstream: Response;
  try {
    upstream = await fetch(source, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
  } catch {
    return new Response('The photograph could not be fetched', { status: 502, headers: { 'cache-control': 'no-store' } });
  }
  if (upstream.status === 400 || upstream.status === 404) return new Response('Not found', NOT_FOUND);
  const type = upstream.headers.get('content-type') || '';
  if (!upstream.ok || !upstream.body || !type.startsWith('image/')) {
    return new Response('The photograph could not be fetched', { status: 502, headers: { 'cache-control': 'no-store' } });
  }

  const headers = new Headers({
    'content-type': type,
    'cache-control': PHOTO_CACHE_CONTROL,
    'access-control-allow-origin': '*',
    'x-content-type-options': 'nosniff',
  });
  for (const name of ['content-length', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: 200, headers });
}
