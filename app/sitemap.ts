import type { MetadataRoute } from 'next';
import { effectiveArticleUpdatedAt, sections } from '@/lib/content';
import { listPublished } from '@/lib/repository';

const origin = process.env.SITE_URL || 'https://www.goldencoastjournal.com';
const institutionalModified = new Date('2026-09-13T00:00:00.000Z');

export const revalidate = 900;

function latestUpdate(values: Array<{ updatedAt: string }>) {
  const timestamps = values
    .map((value) => Date.parse(value.updatedAt))
    .filter(Number.isFinite);
  return timestamps.length
    ? new Date(Math.max(...timestamps))
    : institutionalModified;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await listPublished();
  const publicationModified = latestUpdate(articles);
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: origin,
      lastModified: publicationModified,
      changeFrequency: 'daily',
      priority: 1,
    },
    ...[
      '/about',
      '/briefing',
      '/california-deadlines',
      '/live',
      '/authors/kyle-langford',
      '/standards',
      '/corrections',
      '/privacy',
    ].map((path) => ({
      url: `${origin}${path}`,
      lastModified: institutionalModified,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
  const storyPages = articles.map((article) => ({
    url: `${origin}/article/${article.slug}`,
    lastModified: new Date(effectiveArticleUpdatedAt(article)),
    changeFrequency: 'daily' as const,
    priority: article.featured ? 0.9 : 0.7,
  }));
  const sectionPages = sections.map((section) => ({
    url: `${origin}/section/${section.toLowerCase()}`,
    lastModified: latestUpdate(
      articles.filter((article) => article.section === section),
    ),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));
  return [...staticPages, ...sectionPages, ...storyPages];
}
