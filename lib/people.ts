import {
  disambiguateSameName,
  mentions,
  nameForms,
  normalizePunctuation,
  surnameBelongsToSomeoneElse,
  surnameOf,
} from '@/lib/name-matching';
import { getSupabase, unwrap } from '@/lib/supabase-server';

/**
 * People named in a story, drawn from two registers.
 *
 * `representatives` belongs to the California Votes application this project
 * shares a database with, and means elected representatives: the governor and
 * constitutional officers, both chambers of the Legislature, the congressional
 * delegation, the Board of Equalization. Its portraits and official links come
 * from congress.gov, senate.ca.gov, ltg.ca.gov and the site's own storage
 * bucket, and nothing here writes to it.
 *
 * `gcj_newsmakers` is the Journal's own, and holds the Californians who make
 * news without holding an elected seat: mayors, agency directors, cabinet
 * secretaries, justices, sheriffs and district attorneys, chancellors, and the
 * utility chief executives who appear in every wildfire and rate story. Every
 * row there carries the licence and provenance of its portrait, and the same
 * check constraint as the editorial assets keeps AI imagery out of it.
 *
 * Neither register supplies a new picture at read time; this only reads ones
 * already approved.
 */
export type Official = {
  name: string;
  office: string;
  party: string | null;
  level: string | null;
  photoUrl: string;
  url: string | null;
};

type RegisterRow = {
  name: string;
  office: string;
  party: string | null;
  level: string | null;
  photo_url: string | null;
  urls: string[] | null;
  district: string | null;
  city: string | null;
  county: string | null;
};

/**
 * District, city and county are read for one reason only: they are how a story
 * tells two people of the same name apart.
 */
const COLUMNS = 'name,office,party,level,photo_url,urls,district,city,county';

const CACHE_MS = 10 * 60_000;
let cached: { rows: RegisterRow[]; loadedAt: number } | null = null;

/**
 * Rows without a portrait are loaded too, and deliberately.
 *
 * A name the register knows about is worth knowing even when no publishable
 * picture of that person exists, because the surname rule below counts
 * carriers: the moment the register learns that Cal OES has a director called
 * Caroline Thomas Jacobs, a bare "Jacobs" stops being read as Rep. Sara Jacobs,
 * and "Reynold Hoover, CEO of LA28" stops being read as Assemblymember Josh
 * Hoover. Both of those were real published mistakes. The rows are dropped
 * again at the end, once they have done that work, so a face is never asked for
 * that does not exist.
 */
async function loadRepresentatives() {
  return (
    (unwrap(
      await getSupabase()
        .from('representatives')
        .select(COLUMNS)
        .neq('is_active', false),
      'Unable to load officials',
    ) as RegisterRow[] | null) || []
  );
}

async function loadNewsmakers() {
  return (
    (unwrap(
      await getSupabase()
        .from('gcj_newsmakers')
        .select(COLUMNS)
        .neq('is_active', false),
      'Unable to load newsmakers',
    ) as RegisterRow[] | null) || []
  );
}

/**
 * Both registers, merged. They are settled separately: the Journal's own table
 * is the newer of the two and will not exist in an environment where its
 * migration has not run yet, and a story should still get the elected
 * officials' faces when it does not.
 */
async function loadRegister(): Promise<RegisterRow[]> {
  if (cached && Date.now() - cached.loadedAt < CACHE_MS) return cached.rows;
  const settled = await Promise.allSettled([
    loadRepresentatives(),
    loadNewsmakers(),
  ]);
  if (settled.every((result) => result.status === 'rejected'))
    throw new Error('Unable to load either portrait register');
  const rows = settled.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  );
  cached = { rows, loadedAt: Date.now() };
  return rows;
}

/**
 * Find the people a story actually names. A full-name match always counts. A
 * surname on its own counts only when exactly one person in the register
 * carries it, so "Padilla" never silently picks between a U.S. senator and a
 * state senator of the same name, and only when nothing in the story shows
 * the surname belongs to a different person entirely.
 *
 * A full name can be ambiguous too. California has two Robert Garcias, a U.S.
 * representative from Long Beach and a state assembly member from San
 * Bernardino County, and the same three words name either of them. When
 * several people share the name a story prints, the story's own words have to
 * settle it; if they do not, nobody's face is shown. That includes a story
 * genuinely about both, where these surfaces would have to pick one to lead
 * with and any pick would be arbitrary.
 */
export async function findMentionedOfficials(
  text: string,
  limit = 4,
): Promise<Official[]> {
  let rows: RegisterRow[] = [];
  try {
    rows = await loadRegister();
  } catch {
    return [];
  }
  // Two views of the same string at the same offsets: the lowercased one for
  // matching, the original for reading the capitalisation of neighbouring words.
  // Normalised character for character, so an offset found in `haystack`
  // still reads the original capitalisation at the same index in `original`.
  const original = normalizePunctuation(` ${text} `);
  const haystack = original.toLowerCase();

  const surnameCounts = new Map<string, number>();
  for (const row of rows) {
    const surname = surnameOf(row.name);
    surnameCounts.set(surname, (surnameCounts.get(surname) || 0) + 1);
  }

  const hits: { row: RegisterRow; score: number }[] = [];
  for (const row of rows) {
    const surname = surnameOf(row.name);
    let score = 0;
    if (nameForms(row.name).some((form) => mentions(haystack, form)))
      score = 100;
    else if (
      surname.length > 3 &&
      surnameCounts.get(surname) === 1 &&
      mentions(haystack, surname) &&
      !surnameBelongsToSomeoneElse(original, haystack, surname, row.name)
    )
      score = 50;
    if (score) hits.push({ row, score });
  }

  // Namesakes are grouped by the spelling a story would use for either of
  // them, the one without middle initials, which is the form they both
  // matched on.
  const byName = new Map<string, typeof hits>();
  for (const hit of hits) {
    const forms = nameForms(hit.row.name);
    const key = forms[forms.length - 1];
    const group = byName.get(key);
    if (group) group.push(hit);
    else byName.set(key, [hit]);
  }

  const resolved: typeof hits = [];
  for (const group of byName.values()) {
    if (group.length === 1) {
      resolved.push(group[0]);
      continue;
    }
    const pick = disambiguateSameName(
      haystack,
      group.map((hit) => hit.row),
    );
    if (pick >= 0) resolved.push(group[pick]);
  }

  // Only now are the faceless rows dropped. Doing it earlier would let a
  // namesake with a portrait win by default over one without, which is exactly
  // the coin flip this function exists to refuse.
  return resolved
    .filter(({ row }) => row.photo_url)
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
