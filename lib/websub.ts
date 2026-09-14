export const WEB_SUB_HUB_URL = 'https://pubsubhubbub.appspot.com/';

const WEB_SUB_TIMEOUT_MS = 8_000;

export function journalFeedUrl() {
  const origin = (
    process.env.SITE_URL || 'https://www.goldencoastjournal.com'
  ).replace(/\/$/, '');
  return `${origin}/feed.xml`;
}

export async function notifyWebSubHub() {
  const topic = journalFeedUrl();
  const body = new URLSearchParams({
    'hub.mode': 'publish',
    'hub.url': topic,
  });

  try {
    const response = await fetch(WEB_SUB_HUB_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(WEB_SUB_TIMEOUT_MS),
    });
    return { ok: response.ok, status: response.status, topic };
  } catch {
    return { ok: false, status: null, topic };
  }
}
