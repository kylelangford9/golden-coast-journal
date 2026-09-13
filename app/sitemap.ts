import type { MetadataRoute } from 'next';
import { articles, sections } from '@/lib/content';

const origin = process.env.SITE_URL || 'https://golden-coast-journal.lunar-perch-0381.chatgpt.site';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ['', '/about', '/standards', '/corrections', '/privacy'].map((path) => ({ url: `${origin}${path}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: path ? 0.5 : 1 }));
  const storyPages = articles.map((article) => ({ url: `${origin}/article/${article.slug}`, lastModified: new Date(article.updatedAt), changeFrequency: 'daily' as const, priority: article.featured ? 0.9 : 0.7 }));
  const sectionPages = sections.map((section) => ({ url: `${origin}/section/${section.toLowerCase()}`, lastModified: new Date(), changeFrequency: 'daily' as const, priority: 0.7 }));
  return [...staticPages, ...sectionPages, ...storyPages];
}
