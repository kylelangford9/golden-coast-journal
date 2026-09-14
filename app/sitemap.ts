import type { MetadataRoute } from 'next';
import { californiaPropositions } from '@/lib/california-propositions';
import { effectiveArticleUpdatedAt, sections } from '@/lib/content';
import { listPublished } from '@/lib/repository';

const origin = process.env.SITE_URL || 'https://www.goldencoastjournal.com';
const institutionalModified = new Date('2026-09-14T00:00:00.000Z');
const homepageTemplateModified = new Date('2026-09-14T22:44:03.000Z');
const articleTemplateModified = new Date('2026-09-14T21:08:32.137Z');
const propositionPagesModified = new Date('2026-09-14T19:41:31.000Z');

export const revalidate = 900;

function latestUpdate(values: Array<{ updatedAt: string }>) {
  const timestamps = values
    .map((value) => Date.parse(value.updatedAt))
    .filter(Number.isFinite);
  return timestamps.length
    ? new Date(Math.max(...timestamps))
    : institutionalModified;
}

function laterDate(first: Date, second: Date) {
  return first.getTime() >= second.getTime() ? first : second;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await listPublished();
  const publicationModified = latestUpdate(articles);
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: origin,
      lastModified: laterDate(publicationModified, homepageTemplateModified),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${origin}/california-propositions-2026`,
      lastModified: propositionPagesModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...[
      '/about',
      '/briefing',
      '/california-election-2026',
      '/california-candidates-2026',
      '/california-deadlines',
      '/live',
      '/authors/kyle-langford',
      '/standards',
      '/corrections',
      '/contact',
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
    lastModified: laterDate(
      new Date(effectiveArticleUpdatedAt(article)),
      articleTemplateModified,
    ),
    changeFrequency: 'daily' as const,
    priority: article.featured ? 0.9 : 0.7,
  }));
  const propositionPages = californiaPropositions.map((proposition) => ({
    url: `${origin}/california-propositions-2026/${proposition.number}`,
    lastModified: propositionPagesModified,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));
  const sectionPages = sections
    .map((section) => ({
      section,
      own: articles.filter((article) => article.section === section),
    }))
    .filter(({ own }) => own.length > 0)
    .map(({ section, own }) => ({
      url: `${origin}/section/${section.toLowerCase()}`,
      lastModified: latestUpdate(own),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));
  return [...staticPages, ...propositionPages, ...sectionPages, ...storyPages];
}
