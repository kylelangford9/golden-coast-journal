import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const origin =
    process.env.SITE_URL || 'https://www.goldencoastjournal.com';
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/editorial/'] },
    sitemap: [`${origin}/sitemap.xml`, `${origin}/news-sitemap.xml`],
  };
}
