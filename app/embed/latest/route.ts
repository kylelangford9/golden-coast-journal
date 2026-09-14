import { listPublished } from '@/lib/repository';

export const dynamic = 'force-dynamic';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function GET() {
  const [latest] = await listPublished();
  const title = escapeHtml(latest.title);
  const dek = escapeHtml(latest.dek);
  const section = escapeHtml(latest.section);
  const author = escapeHtml(latest.author);

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,nofollow,noarchive">
    <title>Latest from The Golden Coast Journal</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      html, body { margin: 0; min-height: 100%; }
      body {
        background: #f4efe4;
        color: #171713;
        font-family: Arial, Helvetica, sans-serif;
      }
      main { min-height: 100vh; padding: 20px 22px 24px; }
      header {
        align-items: center;
        border-bottom: 1px solid #b8ad99;
        display: flex;
        justify-content: space-between;
        padding-bottom: 12px;
      }
      .brand {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: clamp(18px, 4.8vw, 28px);
        font-weight: 700;
        letter-spacing: -0.02em;
      }
      .independent {
        color: #6d2d25;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }
      article { padding-top: 16px; }
      .eyebrow {
        color: #8a3328;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.17em;
        margin: 0 0 8px;
        text-transform: uppercase;
      }
      h1 {
        font-family: Georgia, 'Times New Roman', serif;
        font-size: clamp(24px, 6vw, 38px);
        letter-spacing: -0.025em;
        line-height: 1.02;
        margin: 0;
      }
      .dek {
        color: #4e4940;
        display: -webkit-box;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: clamp(13px, 3.2vw, 17px);
        line-height: 1.35;
        margin: 10px 0 13px;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }
      .meta {
        border-top: 1px solid #cfc5b3;
        color: #595247;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.04em;
        margin: 0;
        padding-top: 10px;
        text-transform: uppercase;
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <span class="brand">The Golden Coast Journal</span>
        <span class="independent">Independent newsroom</span>
      </header>
      <article>
        <p class="eyebrow">Latest reporting · ${section}</p>
        <h1>${title}</h1>
        <p class="dek">${dek}</p>
        <p class="meta">By ${author} · ${latest.readingMinutes} min read</p>
      </article>
    </main>
  </body>
</html>`;

  return new Response(html, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}
