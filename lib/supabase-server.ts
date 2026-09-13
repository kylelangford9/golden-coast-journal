import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;

export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const serverSecret = process.env.CRON_SECRET;

  if (!url || !publishableKey || !serverSecret) {
    throw new Error('The Journal database is not configured.');
  }

  client ??= createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { 'x-gcj-secret': serverSecret } },
  });

  return client;
}

export function unwrap<T>(
  result: { data: T; error: { message: string } | null },
  context: string,
): T {
  if (result.error) throw new Error(`${context}: ${result.error.message}`);
  return result.data;
}
