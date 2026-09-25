/**
 * Keys for the Journal's public API.
 *
 * The edition is public: anyone can read it without a key, and nothing a key
 * unlocks is secret. What a key adds is a name. Each site that carries the
 * Journal gets its own, so the newsroom can see who is reading, switch one
 * consumer off without touching the others, and later grant a scope (full
 * story bodies, say) to one partner.
 *
 * A key is `gcj_live_` or `gcj_test_` followed by 32 base-62 characters, about
 * 190 bits of randomness. Only its SHA-256 is stored; a plain hash is the right
 * tool for a random secret of that length (a password needs a slow hash only
 * because a person chose it). The key itself is shown once, when it is issued
 * by scripts/api-keys.mjs, and never again.
 *
 * Nothing here imports the database, so it runs under the tests as-is; the
 * route passes in a lookup.
 */

export const API_KEY_PATTERN = /^gcj_(live|test)_[A-Za-z0-9]{32}$/;
export const EDITION_SCOPE = 'edition:read';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export type ApiKeyRecord = {
  id: string;
  name: string;
  scopes: string[];
  revokedAt: string | null;
};

export type ApiKeyAuth =
  | { status: 'anonymous' }
  | { status: 'valid'; key: ApiKeyRecord }
  | { status: 'invalid'; reason: 'malformed' | 'unknown' | 'revoked' | 'scope' }
  | { status: 'unverified' };

export type ApiKeyLookup = (keyHash: string) => Promise<ApiKeyRecord | null>;

export function bearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header.trim());
  return match ? match[1] : '';
}

export async function hashApiKey(key: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** 32 characters, each drawn without modulo bias. */
export function generateApiKey(environment: 'live' | 'test' = 'live'): string {
  let body = '';
  while (body.length < 32) {
    const bytes = crypto.getRandomValues(new Uint8Array(48));
    for (const byte of bytes) {
      if (byte < 248 && body.length < 32) body += ALPHABET[byte % 62];
    }
  }
  return `gcj_${environment}_${body}`;
}

/** Enough of a key to recognise it in a list, never enough to use it. */
export function keyPrefix(key: string): string {
  return key.slice(0, 13);
}

/**
 * No header is an anonymous reader. A header that is present must be right:
 * a wrong or revoked key is refused rather than quietly downgraded, so a
 * consumer finds out the day its key stops working. If the key store cannot be
 * reached, the request is served as anonymous and marked unverified, because
 * the newsroom's database having a bad minute is no reason to stop printing.
 */
export async function authenticateApiKey(
  header: string | null | undefined,
  lookup: ApiKeyLookup,
  scope: string = EDITION_SCOPE,
): Promise<ApiKeyAuth> {
  const token = bearerToken(header);
  if (token === null) return { status: 'anonymous' };
  if (!API_KEY_PATTERN.test(token)) return { status: 'invalid', reason: 'malformed' };

  let record: ApiKeyRecord | null;
  try {
    record = await lookup(await hashApiKey(token));
  } catch {
    return { status: 'unverified' };
  }
  if (!record) return { status: 'invalid', reason: 'unknown' };
  if (record.revokedAt) return { status: 'invalid', reason: 'revoked' };
  if (!record.scopes.includes(scope)) return { status: 'invalid', reason: 'scope' };
  return { status: 'valid', key: record };
}
