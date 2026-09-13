import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const origin = process.env.SITE_URL || 'https://golden-coast-journal.lunar-perch-0381.chatgpt.site';
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/editorial/'] }, sitemap: `${origin}/sitemap.xml` };
}
