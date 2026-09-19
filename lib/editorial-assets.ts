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
    // A nudge, not a veto: this must stay inside ROTATION_BAND or the desk's
    // default photograph would outscore its siblings on every story and the
    // rotation below would never have more than one candidate to choose from.
    if (asset.is_section_default) score += 5;
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
/**
 * A small stable hash, so a given story keeps the same photograph on every
 * render and across machines. Math.random would reshuffle the page on each
 * request and make the paper look unstable.
 */
function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Candidates this close to the best score are treated as equally good fits. */
const ROTATION_BAND = 12;

export async function selectEditorialAsset(input: {
  section: string;
  title?: string;
  dek?: string;
  /**
   * Distinguishes stories that would otherwise score identically, so six
   * California items do not all run the same photograph of the Capitol. Pass
   * something stable per story, such as the slug or the source URL.
   */
  rotationKey?: string;
}): Promise<EditorialAsset> {
  let rows: EditorialAssetRow[] = [];
  try {
    rows = await loadAssets();
  } catch {
    return getApprovedEditorialAsset(null);
  }
  if (!rows.length) return getApprovedEditorialAsset(null);

  const haystack = `${input.title || ''} ${input.dek || ''}`.toLowerCase();
  const scored = rows
    .map((row) => ({ row, score: scoreAsset(row, input.section, haystack) }))
    .sort((a, b) => b.score - a.score || b.row.priority - a.row.priority);

  if (!scored.length) return getApprovedEditorialAsset(null);

  const bestScore = scored[0].score;
  if (bestScore <= 0) {
    const fallback = rows.find((row) => row.is_global_default);
    if (fallback) return toAsset(fallback);
    return toAsset(scored[0].row);
  }

  // Rotate among the assets that fit this story equally well. A keyword match
  // still wins outright; this only breaks the ties that would otherwise put
  // one photograph on every story of a desk.
  const contenders = scored.filter(
    (entry) => entry.score >= bestScore - ROTATION_BAND,
  );
  const key = input.rotationKey || input.title || '';
  const picked =
    contenders.length > 1 && key
      ? contenders[stableHash(key) % contenders.length]
      : contenders[0];
  return toAsset(picked.row);
}
