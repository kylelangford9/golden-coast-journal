import { getSupabase, unwrap } from '@/lib/supabase-server';

/**
 * Officials named in a story, drawn from the California Votes
 * `representatives` table that this project already shares.
 *
 * The portraits and official links there were chosen deliberately: they come
 * from congress.gov, senate.ca.gov, ltg.ca.gov and the site's own storage
 * bucket. Nothing here sources a new picture; it reads the ones already
 * approved, which is also why no AI imagery can reach this surface.
 */
export type Official = {
  name: string;
  office: string;
  party: string | null;
  level: string | null;
  photoUrl: string;
  url: string | null;
};

type RepRow = {
  name: string;
  office: string;
  party: string | null;
  level: string | null;
  photo_url: string | null;
  urls: string[] | null;
};

const CACHE_MS = 10 * 60_000;
let cached: { rows: RepRow[]; loadedAt: number } | null = null;

async function loadOfficials(): Promise<RepRow[]> {
  if (cached && Date.now() - cached.loadedAt < CACHE_MS) return cached.rows;
  const rows =
    (unwrap(
      await getSupabase()
        .from('representatives')
        .select('name,office,party,level,photo_url,urls')
        .not('photo_url', 'is', null)
        .neq('is_active', false),
      'Unable to load officials',
    ) as RepRow[] | null) || [];
  cached = { rows, loadedAt: Date.now() };
  return rows;
}

function surnameOf(name: string) {
  const parts = name.trim().split(/\s+/).filter((p) => !/^[A-Z]\.$/.test(p));
  return (parts[parts.length - 1] || '').toLowerCase();
}

const isWordChar = (ch: string) => /[a-z0-9]/i.test(ch);

/**
 * Whole-word containment, scanned rather than compiled into a pattern. Names
 * carry apostrophes, hyphens and periods, and building a regex out of them
 * invites an escaping bug for no gain. The boundary check is what matters: it
 * keeps "Bass" from firing inside "bassist".
 */
function mentions(haystack: string, needle: string) {
  if (!needle) return false;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return false;
    const before = at === 0 ? '' : haystack[at - 1];
    const after = haystack[at + needle.length] || '';
    if (!isWordChar(before) && !isWordChar(after)) return true;
    from = at + 1;
  }
}

/**
 * Find officials a story actually names. A full-name match always counts. A
 * surname on its own counts only when exactly one official in the register
 * carries it, so "Padilla" never silently picks between a U.S. senator and a
 * state senator of the same name.
 */
export async function findMentionedOfficials(
  text: string,
  limit = 4,
): Promise<Official[]> {
  let rows: RepRow[] = [];
  try {
    rows = await loadOfficials();
  } catch {
    return [];
  }
  const haystack = ` ${text.toLowerCase()} `;

  const surnameCounts = new Map<string, number>();
  for (const row of rows) {
    const surname = surnameOf(row.name);
    surnameCounts.set(surname, (surnameCounts.get(surname) || 0) + 1);
  }

  const hits: { row: RepRow; score: number }[] = [];
  for (const row of rows) {
    const full = row.name.toLowerCase();
    const surname = surnameOf(row.name);
    let score = 0;
    if (mentions(haystack, full)) score = 100;
    else if (surname.length > 3 && surnameCounts.get(surname) === 1 && mentions(haystack, surname))
      score = 50;
    if (score) hits.push({ row, score });
  }

  return hits
    .sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name))
    .slice(0, limit)
    .map(({ row }) => ({
      name: row.name,
      office: row.office,
      party: row.party,
      level: row.level,
      photoUrl: row.photo_url as string,
      url: row.urls?.[0] || null,
    }));
}
