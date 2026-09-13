import { listPublished } from '@/lib/repository';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const articles = await listPublished();
  const origin =
    process.env.SITE_URL || 'https://golden-coast-journal.vercel.app';
  const items = articles
    .map(
      (article) =>
        `<item><title>${escapeXml(article.title)}</title><link>${origin}/article/${article.slug}</link><guid>${origin}/article/${article.slug}</guid><description>${escapeXml(article.dek)}</description><pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate><category>${escapeXml(article.section)}</category></item>`,
    )
    .join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>The Golden Coast Journal</title><link>${origin}</link><description>Independent reporting and analysis from California to the world.</description>${items}</channel></rss>`;
  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
}
