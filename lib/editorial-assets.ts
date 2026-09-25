import {
  pickEditorialAsset,
  shortlistEditorialAssets,
} from '@/lib/asset-matching';
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
 *
 * Imagery is also self-hosted. `url` must be a repo-relative path or a file in
 * the project storage bucket, and a second check constraint enforces it, so the
 * cron can never publish an article whose picture depends on a remote host
 * staying up. When adding an asset, copy the file into storage first and keep
 * `credit` and `provenance_url` pointing at the original source.
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
  if (cached && Date.now() - cached.loadedAt < ASSET_CACHE_MS)
    return cached.rows;

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

/**
 * The registry row behind a stored article image, for the caption's credit
 * link and the "About this image" card. Articles store the URL, alt and credit
 * they were drafted with but not the provenance, so without this lookup the
 * credit on every registry photograph linked to nowhere.
 */
export async function findAssetByUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    return (await loadAssets()).find((row) => row.url === url) || null;
  } catch {
    return null;
  }
}

/** Exposed so a run can force a reload after the registry changes. */
export function clearEditorialAssetCache() {
  cached = null;
}

/**
 * The photographs the drafting model may choose a story's picture from; see
 * shortlistEditorialAssets. Empty if the registry is unreachable, in which
 * case the model can only answer "none" and the story waits for review.
 */
export async function photoOptionsForStory(input: {
  section: string;
  text: string;
}): Promise<EditorialAssetRow[]> {
  try {
    return shortlistEditorialAssets(await loadAssets(), input);
  } catch {
    return [];
  }
}

export function toAsset(row: EditorialAssetRow): EditorialAsset {
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
 * Pick the best approved image for a story from the database: a picture whose
 * keywords the headline and dek name, preferring the story's own desk, and
 * otherwise one of the desk's generic pictures. The rules are in
 * lib/asset-matching.ts. Falls back to the bundled coast photograph if the
 * table is unreachable, so drafting never fails for want of a picture.
 */
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
  const picked = pickEditorialAsset(rows, input);
  return picked ? toAsset(picked) : getApprovedEditorialAsset(null);
}
