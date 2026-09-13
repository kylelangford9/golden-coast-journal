import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const origin =
    process.env.SITE_URL || 'https://golden-coast-journal.vercel.app';
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/editorial/'] },
    sitemap: [`${origin}/sitemap.xml`, `${origin}/news-sitemap.xml`],
  };
}
