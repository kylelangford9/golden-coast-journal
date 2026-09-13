import { listPublished } from '@/lib/repository';

const origin =
  process.env.SITE_URL || 'https://www.goldencoastjournal.com';

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function GET() {
  const articles = await listPublished();
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;
  const latest = articles.filter(
    (article) =>
      article.status === 'published' &&
      new Date(article.publishedAt).getTime() >= cutoff,
  );
  const urls = latest
    .map(
      (article) => `  <url>
    <loc>${escapeXml(`${origin}/article/${article.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>The Golden Coast Journal</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(article.publishedAt)}</news:publication_date>
      <news:title>${escapeXml(article.title)}</news:title>
    </news:news>
  </url>`,
    )
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`,
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
      },
    },
  );
}
