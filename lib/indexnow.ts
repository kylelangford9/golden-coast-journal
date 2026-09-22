/**
 * IndexNow submission.
 *
 * WebSub tells feed readers that the Journal's feed moved; it does not tell a
 * search engine that one URL is new. IndexNow does, and Bing, Yandex, Seznam
 * and Naver share a single submission between them, so one POST reaches the
 * whole set. Google does not participate, and nothing here substitutes for the
 * sitemaps it does read.
 *
 * The key is served as a plain text file at the site root whose filename is the
 * key itself; that file is how the API proves the caller controls the host. The
 * key is public by design, so it lives in the repository rather than in an
 * environment variable: a secret that must be published is not a secret, and
 * keeping it next to the file it has to match is what stops the two drifting
 * apart.
 */
export const INDEXNOW_KEY = 'a7f3c19e5b8d4e2a9c6f0b3d7e1a4c85';

export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/IndexNow';

const INDEXNOW_TIMEOUT_MS = 8_000;
/** The API rejects a batch larger than this. */
const INDEXNOW_MAX_URLS = 10_000;

export function journalOrigin() {
  return (process.env.SITE_URL || 'https://www.goldencoastjournal.com').replace(
    /\/$/,
    '',
  );
}

export function indexNowKeyLocation() {
  return `${journalOrigin()}/${INDEXNOW_KEY}.txt`;
}

export type IndexNowResult = {
  ok: boolean;
  status: number | null;
  submitted: number;
};

/**
 * Submit one or more freshly published URLs.
 *
 * Every URL has to sit on the same host as the key file, so anything pointing
 * elsewhere is dropped rather than sent; a single foreign URL makes the API
 * reject the whole batch.
 */
export async function submitToIndexNow(
  urls: string[],
): Promise<IndexNowResult> {
  const origin = journalOrigin();
  const host = new URL(origin).host;

  const urlList = Array.from(
    new Set(
      urls
        .map((url) => {
          try {
            return new URL(url, origin).toString();
          } catch {
            return '';
          }
        })
        .filter((url) => url && new URL(url).host === host),
    ),
  ).slice(0, INDEXNOW_MAX_URLS);

  if (!urlList.length) return { ok: false, status: null, submitted: 0 };

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: INDEXNOW_KEY,
        keyLocation: indexNowKeyLocation(),
        urlList,
      }),
      signal: AbortSignal.timeout(INDEXNOW_TIMEOUT_MS),
    });
    // 200 and 202 both mean accepted; 422 means the key or host did not match.
    return {
      ok: response.ok,
      status: response.status,
      submitted: urlList.length,
    };
  } catch {
    return { ok: false, status: null, submitted: 0 };
  }
}

/** The canonical public URL for a published article slug. */
export function articleUrl(slug: string) {
  return `${journalOrigin()}/article/${slug}`;
}
