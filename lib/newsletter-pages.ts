import 'server-only';

type NewsletterResultPageInput = {
  title: string;
  eyebrow: string;
  heading: string;
  body: string;
  status: number;
};

export function newsletterResultPage({
  title,
  eyebrow,
  heading,
  body,
  status,
}: NewsletterResultPageInput) {
  const origin = (process.env.SITE_URL || 'https://www.goldencoastjournal.com').replace(
    /\/$/,
    '',
  );
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title} | The Golden Coast Journal</title>
  <link rel="icon" href="${origin}/favicon.png" type="image/png" sizes="96x96" />
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      min-height: 100vh;
      background: #f6f1e7;
      color: #161713;
      font-family: Georgia, "Times New Roman", serif;
    }
    main {
      max-width: 40rem;
      margin: 0 auto;
      padding: 4rem 1.25rem 3rem;
    }
    .mark {
      display: block;
      width: 3rem;
      height: 3rem;
      margin-bottom: 1.25rem;
    }
    .eyebrow {
      margin: 0 0 0.75rem;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #545148;
    }
    h1 {
      margin: 0 0 1rem;
      font-size: clamp(1.75rem, 4vw, 2.35rem);
      line-height: 1.15;
      font-weight: 400;
      border-top: 3px solid #d8a82a;
      padding-top: 1rem;
    }
    p {
      margin: 0 0 1.5rem;
      font-size: 1.05rem;
      line-height: 1.6;
      color: #545148;
    }
    a {
      color: #17364a;
    }
  </style>
</head>
<body>
  <main>
    <img class="mark" src="${origin}/icon-192.png" width="48" height="48" alt="" />
    <p class="eyebrow">${eyebrow}</p>
    <h1>${heading}</h1>
    <p>${body}</p>
    <p><a href="${origin}/">Return to The Golden Coast Journal</a></p>
  </main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-store',
    },
  });
}
