import { matchPeople } from '@/lib/name-matching';
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
 * utility chief executives who appear in every wildfire and rate story. It
 * also holds the national and international figures the Nation and World desks
 * name, from the President and Vice President (official White House portraits)
 * to the UN Secretary-General. Every row there carries the licence and
 * provenance of its portrait, and the same check constraint as the editorial
 * assets keeps AI imagery out of it.
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
  /** Only the Journal's own register has one; see displayOffice. */
  organization?: string | null;
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
        .select(`${COLUMNS},organization`)
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
 * What the rail prints under a name. The Journal's register files many people
 * under a bare title ("Chair", "Secretary", "Chief Executive Officer") with the
 * body in `organization`; printed alone, "Chair" tells a reader nothing. An
 * office that already says where ("Mayor of Oakland", "Secretary for Natural
 * Resources") is left as it is.
 */
function displayOffice({ office, organization }: RegisterRow) {
  if (!organization || / (of|for) /i.test(office)) return office;
  return `${office}, ${organization}`;
}

/**
 * Find the people a story actually names, most prominent first. The rules,
 * which are pure string work, live in lib/name-matching.ts: a full name always
 * counts; a surname counts when a title or bill number points at exactly one
 * person who carries it, or when only one person in the register carries it
 * and nothing in the story shows it belongs to someone else; and namesakes are
 * settled by the story's own words or not at all.
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

  // Only now are the faceless rows dropped. Doing it earlier would let a
  // namesake with a portrait win by default over one without, which is exactly
  // the coin flip this function exists to refuse.
  return matchPeople(text, rows)
    .filter(({ row }) => row.photo_url)
    .slice(0, limit)
    .map(({ row }) => ({
      name: row.name,
      office: displayOffice(row),
      party: row.party,
      level: row.level,
      photoUrl: row.photo_url as string,
      url: row.urls?.[0] || null,
    }));
}
