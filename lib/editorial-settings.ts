import { getSupabase, unwrap } from '@/lib/supabase-server';

/**
 * Newsroom tuning lives in `gcj_editorial_settings` so the pipeline can be
 * retuned with a SQL update instead of a redeploy. The defaults below are the
 * conservative position the Journal falls back to if a key is missing or the
 * table is unreachable: review everything, publish nothing automatically.
 */
export type EditorialSettings = {
  autoPublish: boolean;
  minConfidenceToPublish: number;
  reviewQueueLimit: number;
  draftsPerRun: number;
};

export const EDITORIAL_SETTING_DEFAULTS: EditorialSettings = {
  autoPublish: false,
  minConfidenceToPublish: 92,
  reviewQueueLimit: 12,
  draftsPerRun: 1,
};

const SETTINGS_CACHE_MS = 60_000;
let cached: { value: EditorialSettings; loadedAt: number } | null = null;

function asBoolean(value: unknown, fallback: boolean) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return fallback;
}

function asBoundedInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

/** Exposed so a run can force a reload after the settings change. */
export function clearEditorialSettingsCache() {
  cached = null;
}

export async function getEditorialSettings(): Promise<EditorialSettings> {
  if (cached && Date.now() - cached.loadedAt < SETTINGS_CACHE_MS)
    return cached.value;

  let rows: { key: string; value: unknown }[] = [];
  try {
    rows =
      (unwrap(
        await getSupabase().from('gcj_editorial_settings').select('key,value'),
        'Unable to load editorial settings',
      ) as { key: string; value: unknown }[] | null) || [];
  } catch {
    return EDITORIAL_SETTING_DEFAULTS;
  }

  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  const value: EditorialSettings = {
    // The database row is the single switch. Stopping publication is one
    // update against gcj_editorial_settings; no redeploy and no environment
    // change is involved, and no per-environment variable can silently
    // contradict what the table says.
    autoPublish: asBoolean(
      byKey.get('auto_publish'),
      EDITORIAL_SETTING_DEFAULTS.autoPublish,
    ),
    minConfidenceToPublish: asBoundedInteger(
      byKey.get('min_confidence_to_publish'),
      EDITORIAL_SETTING_DEFAULTS.minConfidenceToPublish,
      0,
      100,
    ),
    reviewQueueLimit: asBoundedInteger(
      byKey.get('review_queue_limit'),
      EDITORIAL_SETTING_DEFAULTS.reviewQueueLimit,
      1,
      500,
    ),
    draftsPerRun: asBoundedInteger(
      byKey.get('drafts_per_run'),
      EDITORIAL_SETTING_DEFAULTS.draftsPerRun,
      1,
      10,
    ),
  };

  cached = { value, loadedAt: Date.now() };
  return value;
}
