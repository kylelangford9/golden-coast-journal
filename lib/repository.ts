import { articles, type Article } from '@/lib/content';
import { editorialAssetForArticle } from '@/lib/imagery';
import { getSupabase, unwrap } from '@/lib/supabase-server';
import { decodeHtmlEntities } from '@/lib/text';

type ArticleRow = {
  id: string;
  slug: string;
  section: string;
  title: string;
  dek: string;
  body_json: string[] | string;
  key_points_json: string[] | string;
  author: string;
  image_url: string | null;
  image_alt: string | null;
  image_credit: string | null;
  sources_json: Article['sources'] | string;
  status: 'draft' | 'review' | 'published' | 'archived';
  featured: boolean;
  confidence: number;
  published_at: string | null;
  updated_at: string;
  created_at: string;
};

export const publicationSources = [
  {
    id: 'govca',
    name: 'Office of the Governor of California',
    feed_url: 'https://www.gov.ca.gov/feed/',
    homepage_url: 'https://www.gov.ca.gov/newsroom/',
    section: 'California',
    trust_tier: 1,
    active: true,
  },
  {
    id: 'caloes',
    name: 'California Governor’s Office of Emergency Services',
    feed_url: 'https://www.news.caloes.ca.gov/feed/',
    homepage_url: 'https://www.news.caloes.ca.gov/',
    section: 'California',
    trust_tier: 1,
    active: true,
  },
  {
    id: 'whitehouse',
    name: 'The White House',
    feed_url: 'https://www.whitehouse.gov/news/feed/',
    homepage_url: 'https://www.whitehouse.gov/news/',
    section: 'Nation',
    trust_tier: 1,
    active: true,
  },
  {
    id: 'federalreserve',
    name: 'Federal Reserve Board',
    feed_url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    homepage_url: 'https://www.federalreserve.gov/newsevents.htm',
    section: 'Business',
    trust_tier: 1,
    active: true,
  },
  {
    id: 'nasa',
    name: 'NASA',
    feed_url: 'https://www.nasa.gov/news-release/feed/',
    homepage_url: 'https://www.nasa.gov/news-release/',
    section: 'Technology',
    trust_tier: 1,
    active: true,
  },
  {
    id: 'noaa',
    name: 'National Oceanic and Atmospheric Administration',
    feed_url: 'https://www.noaa.gov/rss.xml',
    homepage_url: 'https://www.noaa.gov/news',
    section: 'Climate',
    trust_tier: 1,
    active: true,
  },
  {
    id: 'unnews',
    name: 'United Nations News',
    feed_url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
    homepage_url: 'https://news.un.org/',
    section: 'World',
    trust_tier: 1,
    active: true,
  },
] as const;

function parseArray<T>(value: T[] | string): T[] {
  return Array.isArray(value) ? value : JSON.parse(value);
}

function toRow(article: Article) {
  return {
    id: article.id,
    slug: article.slug,
    section: article.section,
    title: article.title,
    dek: article.dek,
    body_json: article.body,
    key_points_json: article.keyPoints,
    author: article.author,
    image_url: article.imageUrl,
    image_alt: article.imageAlt,
    image_credit: article.imageCredit,
    sources_json: article.sources,
    status: article.status,
    featured: article.featured,
    confidence: 100,
    published_at: article.publishedAt,
    updated_at: article.updatedAt,
    created_at: article.publishedAt,
  };
}

export function fromArticleRow(row: ArticleRow): Article {
  const approvedAsset = editorialAssetForArticle({
    imageUrl: row.image_url,
    imageAlt: row.image_alt,
    imageCredit: row.image_credit,
  });
  const body = parseArray<string>(row.body_json);
  return {
    id: row.id,
    slug: row.slug,
    section: row.section,
    title: row.title,
    dek: row.dek,
    body,
    keyPoints: parseArray<string>(row.key_points_json),
    author: row.author,
    imageUrl: approvedAsset.url,
    imageAlt: approvedAsset.alt,
    imageCredit: approvedAsset.credit,
    sources: parseArray<Article['sources'][number]>(row.sources_json),
    status: row.status === 'archived' ? 'draft' : row.status,
    featured: row.featured,
    publishedAt: row.published_at || row.created_at,
    updatedAt: row.updated_at,
    readingMinutes: Math.max(
      2,
      Math.ceil(body.join(' ').split(/\s+/).length / 220),
    ),
  };
}

export async function seedDatabase() {
  const db = getSupabase();
  unwrap(
    await db
      .from('gcj_articles')
      .upsert(articles.map(toRow), {
        onConflict: 'id',
        ignoreDuplicates: true,
      }),
    'Unable to seed Journal articles',
  );
  // A source is seeded only if it is missing. Once its row exists the
  // database is what counts: this runs on every page and every newsroom run,
  // and overwriting the row switched NOAA back on minutes after it was
  // switched off.
  unwrap(
    await db.from('gcj_sources').upsert(publicationSources, {
      onConflict: 'id',
      ignoreDuplicates: true,
    }),
    'Unable to seed Journal sources',
  );
}

export type DevelopingSignal = {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  sourceHomepage: string;
  section: string;
  publishedAt: string | null;
  discoveredAt: string;
};

/**
 * These readers fall back to bundled content so a database outage never blanks
 * the paper. Left silent, that same fallback also hides a real outage behind a
 * page that looks merely quiet, so every fallback is logged before it is taken.
 */
function reportFallback(source: string, error: unknown) {
  console.error(
    `[gcj] ${source} fell back to bundled content:`,
    error instanceof Error ? error.message : error,
  );
}

export async function listDevelopingSignals(
  limit = 5,
): Promise<DevelopingSignal[]> {
  try {
    await seedDatabase();
    const rows = unwrap(
      await getSupabase()
        .from('gcj_story_candidates')
        .select(
          'id,title,external_url,published_at,discovered_at,gcj_sources!inner(name,homepage_url,section)',
        )
        .order('score', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(Math.max(1, Math.min(limit, 10))),
      'Unable to load developing signals',
    ) as unknown as Array<{
      id: string;
      title: string;
      external_url: string;
      published_at: string | null;
      discovered_at: string;
      gcj_sources: { name: string; homepage_url: string; section: string };
    }>;
    return rows.map((row) => ({
      id: row.id,
      title: decodeHtmlEntities(row.title),
      url: row.external_url,
      sourceName: row.gcj_sources.name,
      sourceHomepage: row.gcj_sources.homepage_url,
      section: row.gcj_sources.section,
      publishedAt: row.published_at,
      discoveredAt: row.discovered_at,
    }));
  } catch (error) {
    reportFallback('listDevelopingSignals', error);
    return [];
  }
}

export async function listPublished(limit = 50): Promise<Article[]> {
  try {
    await seedDatabase();
    const rows = unwrap(
      await getSupabase()
        .from('gcj_articles')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit),
      'Unable to load published stories',
    ) as ArticleRow[];
    return rows.length ? rows.map(fromArticleRow) : articles;
  } catch (error) {
    reportFallback('listPublished', error);
    return articles;
  }
}

export async function findPublishedBySlug(
  slug: string,
): Promise<Article | undefined> {
  try {
    await seedDatabase();
    const row = unwrap(
      await getSupabase()
        .from('gcj_articles')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle(),
      'Unable to load story',
    ) as ArticleRow | null;
    return row ? fromArticleRow(row) : undefined;
  } catch (error) {
    reportFallback('findPublishedBySlug', error);
    return articles.find((article) => article.slug === slug);
  }
}

/**
 * Resolves the slug in an old or hand-built link to the published story it
 * means: the exact slug first, then the newest published slug that starts
 * with it, so a link missing its hash suffix still lands on the story.
 */
export async function resolvePublishedSlug(
  slug: string,
): Promise<string | undefined> {
  if (!/^[a-z0-9-]+$/.test(slug)) return undefined;
  const exact = await findPublishedBySlug(slug);
  if (exact) return exact.slug;
  if (slug.length < 12) return undefined;
  try {
    const rows = unwrap(
      await getSupabase()
        .from('gcj_articles')
        .select('slug')
        .like('slug', `${slug}%`)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(1),
      'Unable to resolve story slug',
    ) as Array<{ slug: string }>;
    return rows[0]?.slug;
  } catch (error) {
    reportFallback('resolvePublishedSlug', error);
    return articles.find((article) => article.slug.startsWith(slug))?.slug;
  }
}

export type Correction = {
  id: string;
  note: string;
  correctedAt: string;
  article: { slug: string; title: string };
};

type CorrectionRow = {
  id: string;
  note: string;
  corrected_at: string;
  gcj_articles: { slug: string; title: string; status: string } | null;
};

/**
 * Corrections on published stories, newest first; all of them, or one
 * story's. The standards page promises that a material correction is attached
 * to the article with its date and substance, so a failure to load them is
 * reported rather than hidden, but it does not take the story down with it.
 */
export async function listCorrections(
  articleId?: string,
): Promise<Correction[]> {
  try {
    let query = getSupabase()
      .from('gcj_corrections')
      .select('id,note,corrected_at,gcj_articles!inner(slug,title,status)')
      .eq('gcj_articles.status', 'published')
      .order('corrected_at', { ascending: false });
    if (articleId) query = query.eq('article_id', articleId);
    const rows = unwrap(
      await query,
      'Unable to load corrections',
    ) as unknown as CorrectionRow[];
    return rows.flatMap((row) =>
      row.gcj_articles
        ? [
            {
              id: row.id,
              note: row.note,
              correctedAt: row.corrected_at,
              article: {
                slug: row.gcj_articles.slug,
                title: row.gcj_articles.title,
              },
            },
          ]
        : [],
    );
  } catch (error) {
    console.error('[gcj] listCorrections failed:', error);
    return [];
  }
}

export type { ArticleRow };
