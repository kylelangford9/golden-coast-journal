/**
 * Choosing a story's photograph from the approved registry.
 *
 * Separate from lib/editorial-assets.ts because none of it touches the
 * database, which lets scripts/editorial-asset-selection.test.mjs run the real
 * rules against real published headlines. It imports nothing for the same
 * reason: Node runs the test straight from the TypeScript source.
 */

export type AssetCandidate = {
  section: string | null;
  keywords: string[];
  priority: number;
  is_section_default: boolean;
  is_global_default: boolean;
};

/** What a one-word keyword found in the headline and dek is worth. */
const WORD = 12;
/**
 * What a keyword of several words is worth. A phrase is the more specific
 * claim: "lake oroville" says more than "lake", and "el niño" more than
 * "proclamation".
 */
const PHRASE = 20;
/** What a picture from the story's own desk is worth over a borrowed one. */
const DESK = 10;

const isWordChar = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

/**
 * Text as keywords are compared against it: typographic dashes, apostrophes
 * and spaces made plain (the same set lib/name-matching.ts normalises), lower
 * case, and hyphens read as spaces, so "half‑staff", "half-staff" and "half
 * staff" are one phrase and a keyword need not be listed three ways.
 */
export function normalizeForKeywords(value: string) {
  return value
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’ʼ´]/g, "'")
    .replace(/[   ]/g, ' ')
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Whether a keyword appears as whole words, allowing a plural ending.
 *
 * Matching used to be substring matching, so "national" fired inside
 * "international" and a story about Newsom's international climate
 * partnerships scored for the Lincoln Memorial; "rail" fired inside "trail";
 * and "ai" had to be removed because it fired inside "said". The boundary is
 * checked on both sides; "s" or "es" may follow, so "charger" finds "EV
 * chargers" and "judge" finds "judges".
 */
export function hasKeyword(haystack: string, keyword: string) {
  const term = normalizeForKeywords(keyword).trim();
  if (!term) return false;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(term, from);
    if (at === -1) return false;
    from = at + 1;
    if (isWordChar(haystack[at - 1] || '')) continue;
    let end = at + term.length;
    if (!isWordChar(haystack[end] || '')) return true;
    if (haystack.startsWith('es', end)) end += 2;
    else if (haystack[end] === 's') end += 1;
    else continue;
    if (!isWordChar(haystack[end] || '')) return true;
  }
}

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

function rotate<T>(pool: T[], key: string) {
  return pool.length > 1 && key ? pool[stableHash(key) % pool.length] : pool[0];
}

/**
 * Pick the photograph for a story, in two steps.
 *
 * First, a picture that is about the story: one whose keywords appear in the
 * headline or dek, phrases counting for more than single words, and a picture
 * from the story's own desk preferred. A picture may come from another desk,
 * because a Constitution Day proclamation on the California desk is better
 * served by the Constitution than by the Capitol, but only on more than a
 * single loose word: two keywords, or one keyword of several words. That keeps
 * "film" alone from pulling the Culture desk's Hollywood sign onto a tax story.
 * A picture with no desk at all belongs to every desk, but on a single word
 * only when the headline says it: "the grid is reliable" is a power-lines
 * story, while a bill roundup whose dek lists "electricity planning" among
 * five subjects is not.
 *
 * Exact ties go to a topical picture over one of the desk's generic ones, then
 * to the higher priority (the registry demotes a picture by lowering it), and
 * only then rotate.
 *
 * Only when nothing is about the story does it fall back to the desk's generic
 * pictures, its section defaults, rotated so one desk does not run a single
 * photograph on every story. The pool used to be every picture on the desk:
 * with no keyword to choose between them, an El Niño emergency drew the ballot
 * drop box, a round of judicial appointments drew a wildfire crew, and a
 * Constitution Day proclamation drew a Central Valley farm.
 *
 * Returns null only for an empty registry.
 */
export function pickEditorialAsset<T extends AssetCandidate>(
  rows: T[],
  input: {
    section: string;
    title?: string;
    dek?: string;
    rotationKey?: string;
  },
): T | null {
  if (!rows.length) return null;
  const desk = input.section.toLowerCase();
  const onDesk = (row: T) => row.section?.toLowerCase() === desk;
  const key = input.rotationKey || input.title || '';
  const haystack = ` ${normalizeForKeywords(`${input.title || ''} ${input.dek || ''}`)} `;
  const headline = ` ${normalizeForKeywords(input.title || '')} `;

  const scored: { row: T; score: number }[] = [];
  for (const row of rows) {
    const hits = row.keywords.filter((keyword) =>
      hasKeyword(haystack, keyword),
    );
    if (!hits.length) continue;
    const phrases = hits.filter((hit) => hit.trim().includes(' ')).length;
    const loose = hits.length < 2 && !phrases;
    const borrowed = row.section !== null && !onDesk(row);
    if (borrowed && loose) continue;
    if (row.section === null && loose && !hasKeyword(headline, hits[0]))
      continue;
    scored.push({
      row,
      score:
        phrases * PHRASE +
        (hits.length - phrases) * WORD +
        (onDesk(row) ? DESK : 0),
    });
  }
  if (scored.length) {
    const best = Math.max(...scored.map((entry) => entry.score));
    let tied = scored
      .filter((entry) => entry.score === best)
      .map((entry) => entry.row);
    const topical = tied.filter((row) => !row.is_section_default);
    if (topical.length) tied = topical;
    const top = Math.max(...tied.map((row) => row.priority));
    return rotate(
      tied.filter((row) => row.priority === top),
      key,
    );
  }

  const generic = rows
    .filter((row) => onDesk(row) && row.is_section_default)
    .sort((a, b) => b.priority - a.priority);
  if (generic.length) return rotate(generic, key);
  return rows.find((row) => row.is_global_default) || rows[0];
}
