import { getApprovedEditorialAsset, type EditorialAsset } from '@/lib/imagery';
import { getSupabase, unwrap } from '@/lib/supabase-server';

/**
 * Editorial imagery lives in `gcj_editorial_assets`, not in this file. The
 * database is the registry; the bundled `lib/imagery.ts` map is kept only as a
 * last-resort fallback for rendering rows written before the table existed.
 *
 * Every asset is a real, attributable photograph or source graphic. The table
 * carries a `check (ai_generated = false)` constraint, so an AI-generated image
 * cannot be stored even by a direct SQL insert.
 */
export type EditorialAssetRow = {
  id: string;
  url: string;
  alt: string;
  credit: string;
  provenance_url: string;
  kind: 'photograph' | 'source-graphic';
  section: string | null;
  keywords: string[];
  priority: number;
  is_section_default: boolean;
  is_global_default: boolean;
};

const ASSET_CACHE_MS = 5 * 60_000;
let cached: { rows: EditorialAssetRow[]; loadedAt: number } | null = null;

async function loadAssets(): Promise<EditorialAssetRow[]> {
  if (cached && Date.now() - cached.loadedAt < ASSET_CACHE_MS) return cached.rows;

  const rows =
    (unwrap(
      await getSupabase()
        .from('gcj_editorial_assets')
        .select(
          'id,url,alt,credit,provenance_url,kind,section,keywords,priority,is_section_default,is_global_default',
        )
        .eq('active', true)
        .eq('article_eligible', true)
        .order('priority', { ascending: false }),
      'Unable to load editorial assets',
    ) as EditorialAssetRow[] | null) || [];

  cached = { rows, loadedAt: Date.now() };
  return rows;
}

/** Exposed so a run can force a reload after the registry changes. */
export function clearEditorialAssetCache() {
  cached = null;
}

function scoreAsset(asset: EditorialAssetRow, section: string, haystack: string) {
  let score = 0;
  if (asset.section && asset.section.toLowerCase() === section.toLowerCase()) {
    score += 50;
    if (asset.is_section_default) score += 20;
  } else if (asset.section) {
    // An asset tied to a different desk is a poor fit; only the global
    // fallback should rescue a story with no sectional match.
    score -= 40;
  }
  for (const keyword of asset.keywords) {
    const term = keyword.trim().toLowerCase();
    if (term && haystack.includes(term)) score += 12;
  }
  if (asset.is_global_default) score += 1;
  return score;
}

function toAsset(row: EditorialAssetRow): EditorialAsset {
  return {
    url: row.url,
    alt: row.alt,
    credit: row.credit,
    provenanceUrl: row.provenance_url,
    kind: row.kind,
    aiGenerated: false,
  };
}

/**
 * Pick the best approved image for a story from the database, matching the
 * desk first and then the headline and dek against each asset's keywords.
 * Falls back to the registry's global default, and finally to the bundled
 * coast photograph if the table is unreachable, so drafting never fails for
 * want of a picture.
 */
export async function selectEditorialAsset(input: {
  section: string;
  title?: string;
  dek?: string;
}): Promise<EditorialAsset> {
  let rows: EditorialAssetRow[] = [];
  try {
    rows = await loadAssets();
  } catch {
    return getApprovedEditorialAsset(null);
  }
  if (!rows.length) return getApprovedEditorialAsset(null);

  const haystack = `${input.title || ''} ${input.dek || ''}`.toLowerCase();
  let best: EditorialAssetRow | null = null;
  let bestScore = -Infinity;

  for (const row of rows) {
    const score = scoreAsset(row, input.section, haystack);
    if (score > bestScore || (score === bestScore && best && row.priority > best.priority)) {
      best = row;
      bestScore = score;
    }
  }

  if (!best) return getApprovedEditorialAsset(null);
  if (bestScore <= 0) {
    const fallback = rows.find((row) => row.is_global_default);
    if (fallback) return toAsset(fallback);
  }
  return toAsset(best);
}
