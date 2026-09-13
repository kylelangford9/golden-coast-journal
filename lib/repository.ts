import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { articles as articleTable, sources as sourceTable } from '@/db/schema';
import { articles, type Article } from '@/lib/content';
import { getApprovedEditorialAsset } from '@/lib/imagery';

function toRow(article: Article) {
  return {
    id: article.id,
    slug: article.slug,
    section: article.section,
    title: article.title,
    dek: article.dek,
    bodyJson: JSON.stringify(article.body),
    keyPointsJson: JSON.stringify(article.keyPoints),
    author: article.author,
    imageUrl: article.imageUrl,
    imageAlt: article.imageAlt,
    imageCredit: article.imageCredit,
    sourcesJson: JSON.stringify(article.sources),
    status: article.status,
    featured: article.featured,
    confidence: 100,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    createdAt: article.publishedAt,
  } as const;
}

function fromRow(row: typeof articleTable.$inferSelect): Article {
  const approvedAsset = getApprovedEditorialAsset(row.imageUrl);
  return {
    id: row.id,
    slug: row.slug,
    section: row.section,
    title: row.title,
    dek: row.dek,
    body: JSON.parse(row.bodyJson),
    keyPoints: JSON.parse(row.keyPointsJson),
    author: row.author,
    imageUrl: approvedAsset.url,
    imageAlt: approvedAsset.alt,
    imageCredit: approvedAsset.credit,
    sources: JSON.parse(row.sourcesJson),
    status: row.status === 'archived' ? 'draft' : row.status,
    featured: row.featured,
    publishedAt: row.publishedAt || row.createdAt,
    updatedAt: row.updatedAt,
    readingMinutes: Math.max(2, Math.ceil(JSON.parse(row.bodyJson).join(' ').split(/\s+/).length / 220)),
  };
}

export async function seedDatabase() {
  const db = getDb();
  for (const article of articles) {
    await db.insert(articleTable).values(toRow(article)).onConflictDoNothing();
  }
  const publicationSources = [
    { id: 'govca', name: 'Office of the Governor of California', feedUrl: 'https://www.gov.ca.gov/feed/', homepageUrl: 'https://www.gov.ca.gov/newsroom/', section: 'California', trustTier: 1, active: true },
    { id: 'caloes', name: 'California Governor’s Office of Emergency Services', feedUrl: 'https://www.news.caloes.ca.gov/feed/', homepageUrl: 'https://www.news.caloes.ca.gov/', section: 'California', trustTier: 1, active: true },
  ];
  for (const source of publicationSources) {
    await db.insert(sourceTable).values(source).onConflictDoUpdate({ target: sourceTable.id, set: source });
  }
}

export async function listPublished(): Promise<Article[]> {
  try {
    await seedDatabase();
    const rows = await getDb().select().from(articleTable).where(eq(articleTable.status, 'published')).orderBy(desc(articleTable.publishedAt)).limit(50);
    return rows.length ? rows.map(fromRow) : articles;
  } catch {
    return articles;
  }
}

export async function findPublishedBySlug(slug: string): Promise<Article | undefined> {
  try {
    await seedDatabase();
    const [row] = await getDb().select().from(articleTable).where(eq(articleTable.slug, slug)).limit(1);
    return row?.status === 'published' ? fromRow(row) : undefined;
  } catch {
    return articles.find((article) => article.slug === slug);
  }
}
