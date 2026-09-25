import type { Article } from './content';

/**
 * Today's paper, laid out by the Journal.
 *
 * Every site that carried the Journal used to pull the latest fifty stories
 * with their full bodies and decide for itself which one was the cover and
 * where the rest went. Each copy of that decision could drift from the
 * newsroom's, and one did: kylelangford.org kept its own list of image hosts
 * and rejected every cover once the photographs moved into our storage. The
 * edition is the newsroom making that decision once, for everyone:
 *
 *   front   the cover story (newest featured story with a photograph) and two
 *           briefs from different sections
 *   inside  page 2 is the freshest section that is neither the cover's nor
 *           California's; page 3 is "Around the state", the California desk
 *   back    the next two stories, for the back page
 *
 * No story appears twice. Only headline-level fields leave the building: no
 * bodies, no sources, no drafts, nothing scheduled for later.
 *
 * It imports nothing at run time, so scripts/edition.test.mjs runs it straight
 * from the TypeScript source.
 */

/**
 * Where the Journal's photographs live, and the address it serves them under.
 *
 * Editorial imagery is copied into one public storage bucket (see the
 * remotePatterns note in next.config.ts). Readers of the API never see that
 * bucket: app/media/photos/[...path]/route.ts serves it, and
 * `journalMediaUrl` turns a stored image URL into the same path on the
 * Journal's own domain. A consumer that trusts goldencoastjournal.com can show
 * every photograph without keeping its own list of storage hosts, which is the
 * list that drifted and emptied the kylelangford.org tile in September 2026.
 *
 * The route, not a rewrite, because storage answers every object with
 * `Cache-Control: no-cache` (the intake never set one), and a rewrite passes
 * that through: every reader re-asked for every photograph on every view.
 */
export const JOURNAL_PHOTO_ORIGIN =
  'https://eoifovdmuuqdcospamru.supabase.co/storage/v1/object/public/photos';

export const JOURNAL_MEDIA_PATH = '/media/photos';

/**
 * How long a photograph may be reused. Short, because the intake upserts: a
 * corrected picture keeps its file name, and a correction should reach every
 * reader within the hour. The edge refreshes in the background after that, so
 * readers are still served from cache while it does.
 */
export const PHOTO_CACHE_CONTROL = 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400';

const PHOTO_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/**
 * The storage address for a /media/photos path, or null for anything that is
 * not a plain photo path (no dot segments, no encoded slashes, at most four
 * levels deep). Shared by the route and by `journalMediaUrl`, so the API never
 * hands out an address the route would refuse.
 */
export function journalPhotoSource(segments: readonly string[]): string | null {
  if (segments.length === 0 || segments.length > 4) return null;
  if (!segments.every((segment) => PHOTO_SEGMENT.test(segment) && !segment.includes('..'))) return null;
  return `${JOURNAL_PHOTO_ORIGIN}/${segments.join('/')}`;
}

/**
 * The public address of a stored photograph, or null when the image is not
 * one of the Journal's own. Anything else is dropped rather than passed
 * through, so the API can only ever hand out pictures on the Journal's domain.
 */
export function journalMediaUrl(imageUrl: string | null | undefined, origin: string): string | null {
  if (!imageUrl) return null;
  const site = origin.replace(/\/+$/, '');
  let parsed: URL;
  try {
    parsed = new URL(imageUrl, site);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.origin !== new URL(site).origin) return null;
  if (parsed.username || parsed.password) return null;

  const stored = `${JOURNAL_PHOTO_ORIGIN}/`;
  if (parsed.href.startsWith(stored)) {
    const rest = parsed.href.slice(stored.length).split(/[?#]/)[0];
    return journalPhotoSource(rest.split('/')) ? `${site}${JOURNAL_MEDIA_PATH}/${rest}` : null;
  }
  const mediaPrefix = `${JOURNAL_MEDIA_PATH}/`;
  if (parsed.origin === new URL(site).origin && parsed.pathname.startsWith(mediaPrefix)) {
    return journalPhotoSource(parsed.pathname.slice(mediaPrefix.length).split('/')) ? `${site}${parsed.pathname}` : null;
  }
  return null;
}

export const EDITION_VERSION = 1;
const HOME_SECTION = 'California';

export type EditionImage = { url: string; alt: string; credit: string };

export type EditionStory = {
  slug: string;
  url: string;
  section: string;
  headline: string;
  dek: string;
  byline: string;
  publishedAt: string;
  readingMinutes: number;
  image: EditionImage | null;
};

export type EditionPage = {
  section: string;
  title: string;
  lead: EditionStory;
  briefs: EditionStory[];
};

export type Edition = {
  version: typeof EDITION_VERSION;
  date: string;
  updatedAt: string;
  front: { cover: EditionStory; briefs: EditionStory[] };
  inside: EditionPage[];
  back: { briefs: EditionStory[] };
};

type Options = { origin: string; now?: number };

export function californiaDate(now: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(now));
}

export function toEditionStory(article: Article, origin: string): EditionStory {
  const site = origin.replace(/\/+$/, '');
  const imageUrl = journalMediaUrl(article.imageUrl, site);
  return {
    slug: article.slug,
    url: `${site}/article/${article.slug}`,
    section: article.section,
    headline: article.title,
    dek: article.dek,
    byline: article.author,
    publishedAt: article.publishedAt,
    readingMinutes: article.readingMinutes,
    image: imageUrl ? { url: imageUrl, alt: article.imageAlt || '', credit: article.imageCredit || '' } : null,
  };
}

export function buildEdition(articles: Article[], { origin, now = Date.now() }: Options): Edition | null {
  const live = articles
    .filter((article) => article && article.status === 'published' && article.slug && article.title)
    .filter((article) => Date.parse(article.publishedAt) <= now)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  if (live.length === 0) return null;

  const used = new Set<string>();
  const unused = (keep: (article: Article) => boolean = () => true) =>
    live.filter((article) => !used.has(article.slug) && keep(article));
  const take = (article: Article) => {
    used.add(article.slug);
    return toEditionStory(article, origin);
  };
  const hasPhoto = (article: Article) => journalMediaUrl(article.imageUrl, origin) !== null;

  const coverArticle =
    unused((article) => article.featured && hasPhoto(article))[0] ?? unused(hasPhoto)[0] ?? live[0];
  const cover = take(coverArticle);

  const briefs: EditionStory[] = [];
  const firstBrief = unused()[0];
  if (firstBrief) {
    briefs.push(take(firstBrief));
    const secondBrief = unused((article) => article.section !== firstBrief.section)[0] ?? unused()[0];
    if (secondBrief) briefs.push(take(secondBrief));
  }

  const inside: EditionPage[] = [];
  const otherSection = unused((article) => article.section !== HOME_SECTION && article.section !== coverArticle.section)[0]?.section;
  if (otherSection) {
    const lead = take(unused((article) => article.section === otherSection)[0]);
    const brief = unused((article) => article.section === otherSection)[0] ?? unused((article) => article.section !== HOME_SECTION)[0];
    inside.push({ section: otherSection, title: otherSection, lead, briefs: brief ? [take(brief)] : [] });
  }
  const home = unused((article) => article.section === HOME_SECTION);
  if (home.length > 0) {
    const lead = take(home[0]);
    const pageBriefs = unused((article) => article.section === HOME_SECTION).slice(0, 2).map(take);
    inside.push({ section: HOME_SECTION, title: 'Around the state', lead, briefs: pageBriefs });
  }

  const back = { briefs: unused().slice(0, 2).map(take) };

  return {
    version: EDITION_VERSION,
    date: californiaDate(now),
    updatedAt: live[0].publishedAt,
    front: { cover, briefs },
    inside,
    back,
  };
}
