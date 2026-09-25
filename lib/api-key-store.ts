import 'server-only';
import type { ApiKeyRecord } from '@/lib/api-keys';
import { getSupabase, unwrap } from '@/lib/supabase-server';

type ApiKeyRow = {
  id: string;
  name: string;
  scopes: string[] | null;
  revoked_at: string | null;
};

export async function findApiKeyByHash(keyHash: string): Promise<ApiKeyRecord | null> {
  const row = unwrap(
    await getSupabase()
      .from('gcj_api_keys')
      .select('id, name, scopes, revoked_at')
      .eq('key_hash', keyHash)
      .maybeSingle(),
    'Unable to look up the API key',
  ) as ApiKeyRow | null;
  if (!row) return null;
  return { id: row.id, name: row.name, scopes: row.scopes ?? [], revokedAt: row.revoked_at };
}

/**
 * When a key was last seen, to the nearest five minutes. The edition is cached
 * at the edge, so this records the reads that reached the newsroom, which is
 * what "is this consumer still using us" needs, at one write per five minutes
 * per key at most.
 */
export async function touchApiKey(id: string): Promise<void> {
  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  unwrap(
    await getSupabase()
      .from('gcj_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', id)
      .or(`last_used_at.is.null,last_used_at.lt.${cutoff}`),
    'Unable to record the API key read',
  );
}
