import 'server-only';

export type NewsletterTokenPurpose = 'confirm' | 'unsubscribe';

function secretBytes() {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('Newsletter tokens are not configured.');
  return new TextEncoder().encode(secret);
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sign(payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes(),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return toBase64Url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload)));
}

async function verify(payload: string, signature: string) {
  const expected = await sign(payload);
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createNewsletterToken(
  subscriberId: string,
  purpose: NewsletterTokenPurpose,
) {
  const body = toBase64Url(new TextEncoder().encode(`${purpose}:${subscriberId}`));
  const signature = await sign(`${purpose}:${subscriberId}`);
  return `${body}.${signature}`;
}

export async function readNewsletterToken(token: string | null | undefined): Promise<
  | { ok: true; subscriberId: string; purpose: NewsletterTokenPurpose }
  | { ok: false }
> {
  if (!token || token.length > 512) return { ok: false };
  const [body, signature] = token.split('.');
  if (!body || !signature) return { ok: false };
  let payload: string;
  try {
    payload = new TextDecoder().decode(fromBase64Url(body));
  } catch {
    return { ok: false };
  }
  const separator = payload.indexOf(':');
  if (separator <= 0) return { ok: false };
  const purpose = payload.slice(0, separator);
  const subscriberId = payload.slice(separator + 1);
  if (
    (purpose !== 'confirm' && purpose !== 'unsubscribe') ||
    !subscriberId ||
    subscriberId.length > 80
  ) {
    return { ok: false };
  }
  if (!(await verify(payload, signature))) return { ok: false };
  return { ok: true, subscriberId, purpose };
}
