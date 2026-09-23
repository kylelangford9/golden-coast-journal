import type { Article } from '@/lib/content';
import { canonicalName, matchPeople, type Span } from '@/lib/name-matching';
import { listPublished } from '@/lib/repository';
import { getSupabase, unwrap } from '@/lib/supabase-server';
import { excerptAround } from '@/lib/text';

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
  /** The person's page on the Journal: /people/[slug]. */
  slug: string;
};

/** A person as a reader meets them: in a card, on their page, in the index. */
export type Person = {
  slug: string;
  name: string;
  office: string;
  party: string | null;
  level: string | null;
  photoUrl: string | null;
  url: string | null;
  /**
   * Where the portrait came from. The Journal's own register records credit,
   * licence and the page the licence was read on; the California Votes
   * register holds official portraits from the legislature and Congress.
   */
  portrait: {
    credit: string;
    license: string | null;
    provenanceUrl: string | null;
  } | null;
};

type RegisterRow = {
  name: string;
  office: string;
  /** Only the Journal's own register has these; see displayOffice. */
  organization?: string | null;
  id?: string;
  credit?: string | null;
  license?: string | null;
  provenance_url?: string | null;
  party: string | null;
  level: string | null;
  photo_url: string | null;
  urls: string[] | null;
  district: string | null;
  city: string | null;
  county: string | null;
  /** Assigned once the register is loaded; see assignSlugs. */
  slug: string;
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
        .select(`${COLUMNS},id,organization,credit,license,provenance_url`)
        .neq('is_active', false),
      'Unable to load newsmakers',
    ) as RegisterRow[] | null) || []
  );
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * A person's address on the Journal. The Journal's own rows keep the id they
 * were registered under; everyone else is named by their canonical name, and
 * two people who share one (California's two Robert Garcias) are told apart by
 * district, so neither address depends on which row loaded first.
 */
function assignSlugs(rows: RegisterRow[]) {
  const base = (row: RegisterRow) => row.id || slugify(canonicalName(row.name));
  const counts = new Map<string, number>();
  for (const row of rows)
    counts.set(base(row), (counts.get(base(row)) || 0) + 1);
  for (const row of rows) {
    const slug = base(row);
    row.slug =
      counts.get(slug) === 1
        ? slug
        : `${slug}-${slugify(row.district || row.office)}`;
  }
  return rows;
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
  const rows = assignSlugs(
    settled.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : [],
    ),
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

function toPerson(row: RegisterRow): Person {
  return {
    slug: row.slug,
    name: row.name,
    office: displayOffice(row),
    party: row.party,
    level: row.level,
    photoUrl: row.photo_url,
    url: row.urls?.[0] || null,
    portrait: row.photo_url
      ? row.credit
        ? {
            credit: row.credit,
            license: row.license || null,
            provenanceUrl: row.provenance_url || null,
          }
        : { credit: 'Official portrait', license: null, provenanceUrl: null }
      : null,
  };
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
      slug: row.slug,
    }));
}

/** Where a person is first named in a story's body, paragraph by paragraph. */
export type BodyMention = { paragraph: number; start: number; end: number };

export type StoryPerson = Person & {
  /** How many times the story refers to them. */
  mentions: number;
  /** The first reference in the body, which is where their card opens. */
  firstBodyMention: BodyMention | null;
};

/**
 * The parts of a story, in the order a reader meets them, joined so that a
 * name can never run across a part boundary.
 */
function storyText(article: Pick<Article, 'title' | 'dek' | 'body'>) {
  const parts = [article.title, article.dek, ...article.body];
  const starts: number[] = [];
  let offset = 0;
  for (const part of parts) {
    starts.push(offset);
    offset += part.length + 1;
  }
  return { text: parts.join('\n'), parts, starts };
}

function locate(starts: number[], span: Span) {
  let part = 0;
  while (part + 1 < starts.length && starts[part + 1] <= span.start) part += 1;
  return {
    part,
    start: span.start - starts[part],
    end: span.end - starts[part],
  };
}

/**
 * Everyone a story names, faces or not, with where each is first named in the
 * body: what the article page needs to put a card on a name.
 */
export async function peopleInStory(
  article: Pick<Article, 'title' | 'dek' | 'body'>,
): Promise<StoryPerson[]> {
  let rows: RegisterRow[] = [];
  try {
    rows = await loadRegister();
  } catch {
    return [];
  }
  const { text, starts } = storyText(article);
  return matchPeople(text, rows).map(({ row, spans }) => {
    // Parts 0 and 1 are the headline and dek; the body starts at part 2.
    const inBody = spans
      .map((span) => locate(starts, span))
      .find((at) => at.part >= 2);
    return {
      ...toPerson(row),
      mentions: spans.length,
      firstBodyMention: inBody
        ? { paragraph: inBody.part - 2, start: inBody.start, end: inBody.end }
        : null,
    };
  });
}

export type CoverageStory = {
  slug: string;
  title: string;
  section: string;
  publishedAt: string;
  imageUrl: string;
  imageAlt: string;
  mentions: number;
  /** The sentence the person first appears in, with their name marked. */
  excerpt: { text: string; markStart: number; markEnd: number };
};

export type PersonCoverage = Person & {
  stories: CoverageStory[];
  /** Other people named in the same stories, most shared first. */
  alongside: { person: Person; stories: number }[];
};

const COVERAGE_MS = 10 * 60_000;
let coverageCache: {
  people: Map<string, PersonCoverage>;
  loadedAt: number;
} | null = null;

/**
 * Every person the Journal has named in a published story, with those stories.
 *
 * It runs the same matcher the article page runs, over every published story,
 * so a person's page lists exactly the stories whose cards point to it. Built
 * once and held for ten minutes, like the register it reads.
 */
export async function peopleCoverage(): Promise<Map<string, PersonCoverage>> {
  if (coverageCache && Date.now() - coverageCache.loadedAt < COVERAGE_MS)
    return coverageCache.people;
  let rows: RegisterRow[] = [];
  try {
    rows = await loadRegister();
  } catch {
    return new Map();
  }
  const stories = await listPublished(500);
  const people = new Map<string, PersonCoverage>();
  const together = new Map<string, Map<string, number>>();

  for (const story of stories) {
    const { text, parts, starts } = storyText(story);
    const found = matchPeople(text, rows);
    for (const { row, spans } of found) {
      const located = spans.map((span) => locate(starts, span));
      const first = located.find((at) => at.part >= 2) || located[0];
      const entry =
        people.get(row.slug) ||
        people
          .set(row.slug, { ...toPerson(row), stories: [], alongside: [] })
          .get(row.slug)!;
      entry.stories.push({
        slug: story.slug,
        title: story.title,
        section: story.section,
        publishedAt: story.publishedAt,
        imageUrl: story.imageUrl,
        imageAlt: story.imageAlt,
        mentions: spans.length,
        excerpt: excerptAround(parts[first.part], first.start, first.end),
      });
      const partners = together.get(row.slug) || new Map<string, number>();
      for (const other of found)
        if (other.row.slug !== row.slug)
          partners.set(other.row.slug, (partners.get(other.row.slug) || 0) + 1);
      together.set(row.slug, partners);
    }
  }

  for (const [slug, entry] of people) {
    entry.stories.sort(
      (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
    );
    entry.alongside = [...(together.get(slug) || new Map<string, number>())]
      .map(([other, count]) => ({ person: people.get(other)!, stories: count }))
      .filter((item) => item.person)
      .sort(
        (a, b) =>
          b.stories - a.stories || a.person.name.localeCompare(b.person.name),
      )
      .slice(0, 8)
      .map(({ person, stories: count }) => ({
        person: stripCoverage(person),
        stories: count,
      }));
  }

  coverageCache = { people, loadedAt: Date.now() };
  return people;
}

function stripCoverage(person: PersonCoverage): Person {
  return {
    slug: person.slug,
    name: person.name,
    office: person.office,
    party: person.party,
    level: person.level,
    photoUrl: person.photoUrl,
    url: person.url,
    portrait: person.portrait,
  };
}

export async function findPersonCoverage(slug: string) {
  return (await peopleCoverage()).get(slug) || null;
}

/**
 * The people most in the news: named in the most stories published within the
 * window, most recent first on a tie. Faces only, because this is a row of
 * portraits.
 */
export async function peopleInTheNews(days = 7, limit = 8) {
  const since = Date.now() - days * 86_400_000;
  return [...(await peopleCoverage()).values()]
    .map((person) => ({
      person: stripCoverage(person),
      recent: person.stories.filter(
        (story) => Date.parse(story.publishedAt) >= since,
      ),
    }))
    .filter(({ person, recent }) => person.photoUrl && recent.length)
    .sort(
      (a, b) =>
        b.recent.length - a.recent.length ||
        Date.parse(b.recent[0].publishedAt) -
          Date.parse(a.recent[0].publishedAt),
    )
    .slice(0, limit)
    .map(({ person, recent }) => ({ ...person, stories: recent.length }));
}
