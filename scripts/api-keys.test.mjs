import assert from 'node:assert/strict';

import {
  API_KEY_PATTERN,
  authenticateApiKey,
  bearerToken,
  generateApiKey,
  hashApiKey,
  keyPrefix,
} from '../lib/api-keys.ts';

/**
 * Keys for the public edition. No key is an anonymous reader; a key that is
 * sent must be right; and the key store being down never stops the paper.
 */

// Generation: the documented shape, unique, never a short or biased body.
const keys = Array.from({ length: 200 }, () => generateApiKey());
for (const key of keys) assert.match(key, API_KEY_PATTERN);
assert.equal(new Set(keys).size, keys.length);
assert.match(generateApiKey('test'), /^gcj_test_[A-Za-z0-9]{32}$/);
assert.equal(keyPrefix('gcj_live_AbCdEfGhIjKlMnOpQrStUvWxYz012345'), 'gcj_live_AbCd');

// Hashing: SHA-256 hex, deterministic, and the key itself never appears.
const key = 'gcj_live_AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const hash = await hashApiKey(key);
assert.match(hash, /^[0-9a-f]{64}$/);
assert.equal(hash, await hashApiKey(key));
assert.notEqual(hash, await hashApiKey(`${key.slice(0, -1)}6`));

// Header parsing.
assert.equal(bearerToken(null), null);
assert.equal(bearerToken(''), null);
assert.equal(bearerToken(`Bearer ${key}`), key);
assert.equal(bearerToken(`bearer   ${key}  `), key);
assert.equal(bearerToken(`Basic ${key}`), '', 'a header that is not Bearer is a malformed key, not an anonymous read');

const record = { id: 'k1', name: 'kylelangford.org', scopes: ['edition:read'], revokedAt: null };
const store = (rows) => async (keyHash) => rows[keyHash] ?? null;
const known = store({ [hash]: record });

assert.deepEqual(await authenticateApiKey(null, known), { status: 'anonymous' });
assert.deepEqual(await authenticateApiKey(`Bearer ${key}`, known), { status: 'valid', key: record });
assert.deepEqual(await authenticateApiKey('Bearer not-a-key', known), { status: 'invalid', reason: 'malformed' });
assert.deepEqual(await authenticateApiKey(`Basic ${key}`, known), { status: 'invalid', reason: 'malformed' });
assert.deepEqual(
  await authenticateApiKey(`Bearer ${generateApiKey()}`, known),
  { status: 'invalid', reason: 'unknown' },
);
assert.deepEqual(
  await authenticateApiKey(`Bearer ${key}`, store({ [hash]: { ...record, revokedAt: '2026-09-25T00:00:00Z' } })),
  { status: 'invalid', reason: 'revoked' },
);
assert.deepEqual(
  await authenticateApiKey(`Bearer ${key}`, store({ [hash]: { ...record, scopes: [] } })),
  { status: 'invalid', reason: 'scope' },
);

// The store is down: serve, but say the key was not checked.
const broken = async () => {
  throw new Error('relation "gcj_api_keys" does not exist');
};
assert.deepEqual(await authenticateApiKey(`Bearer ${key}`, broken), { status: 'unverified' });
// A malformed key is refused before the store is ever asked.
assert.deepEqual(await authenticateApiKey('Bearer nope', broken), { status: 'invalid', reason: 'malformed' });

// The lookup receives the hash, never the key.
let seen;
await authenticateApiKey(`Bearer ${key}`, async (keyHash) => {
  seen = keyHash;
  return record;
});
assert.equal(seen, hash);

console.log('PASS API keys: anonymous reads work, wrong keys are refused, only hashes reach the store');
