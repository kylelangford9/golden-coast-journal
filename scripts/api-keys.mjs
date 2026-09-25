/**
 * Issue, list and revoke keys for the Journal's public API.
 *
 *   node scripts/api-keys.mjs issue "kylelangford.org"
 *   node scripts/api-keys.mjs issue "Staging" --test
 *   node scripts/api-keys.mjs list
 *   node scripts/api-keys.mjs revoke gcj_live_Ab3x
 *
 * `issue` prints the key once. Only its SHA-256 is stored, so a lost key is
 * revoked and reissued, never recovered. Reads SUPABASE_URL,
 * SUPABASE_PUBLISHABLE_KEY and CRON_SECRET from the environment, or from
 * .env.local when it exists, the same credentials the server uses.
 */
import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

import { generateApiKey, hashApiKey, keyPrefix } from '../lib/api-keys.ts';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, CRON_SECRET } = process.env;
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !CRON_SECRET) {
  console.error('Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and CRON_SECRET, or run from a checkout with .env.local.');
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-gcj-secret': CRON_SECRET } },
});

const [command, ...rest] = process.argv.slice(2);

function fail(message, error) {
  console.error(message + (error ? `: ${error.message}` : ''));
  process.exit(1);
}

if (command === 'issue') {
  const name = rest.filter((arg) => !arg.startsWith('--')).join(' ').trim();
  if (!name) fail('Name the consumer: node scripts/api-keys.mjs issue "kylelangford.org"');
  const key = generateApiKey(rest.includes('--test') ? 'test' : 'live');
  const { error } = await db.from('gcj_api_keys').insert({
    name,
    key_prefix: keyPrefix(key),
    key_hash: await hashApiKey(key),
  });
  if (error) fail('Could not store the key', error);
  console.log(`Issued a key for ${name}. It is shown once; store it as that site's GCJ_API_KEY:\n\n  ${key}\n`);
} else if (command === 'list') {
  const { data, error } = await db
    .from('gcj_api_keys')
    .select('name, key_prefix, scopes, created_at, last_used_at, revoked_at')
    .order('created_at');
  if (error) fail('Could not list keys', error);
  if (!data.length) console.log('No keys issued yet.');
  for (const row of data) {
    const state = row.revoked_at ? `revoked ${row.revoked_at.slice(0, 10)}` : row.last_used_at ? `last used ${row.last_used_at.slice(0, 16).replace('T', ' ')} UTC` : 'never used';
    console.log(`${row.key_prefix}…  ${row.name}  [${row.scopes.join(', ')}]  ${state}`);
  }
} else if (command === 'revoke') {
  const prefix = rest[0];
  if (!prefix) fail('Give the key prefix shown by `list`, for example gcj_live_Ab3x');
  const { data, error } = await db
    .from('gcj_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('key_prefix', prefix.replace(/…$/, ''))
    .is('revoked_at', null)
    .select('name');
  if (error) fail('Could not revoke the key', error);
  if (!data.length) fail(`No active key starts with ${prefix}`);
  console.log(`Revoked ${data.map((row) => row.name).join(', ')}.`);
} else {
  console.log('Usage: node scripts/api-keys.mjs issue "<name>" [--test] | list | revoke <prefix>');
  process.exit(command ? 1 : 0);
}
