import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

async function source(relativePath) {
  return readFile(
    new URL(relativePath, `file:///${root.replaceAll('\\', '/')}/`),
    'utf8',
  );
}

const layout = await source('app/layout.tsx');
assert.doesNotMatch(
  layout,
  /alternates:\s*{\s*canonical:/,
  'Shared layout must not force every route to use the homepage canonical.',
);
assert.match(layout, /rel="alternate"/);
assert.match(layout, /type="application\/rss\+xml"/);
assert.ok(layout.includes('href={`${origin}/feed.xml`}'));
assert.match(layout, /url: '\/favicon\.png'/);
assert.doesNotMatch(layout, /favicon\.svg/);

const home = await source('app/page.tsx');
assert.match(home, /'@type': 'WebSite'/);
assert.match(home, /name: 'The Golden Coast Journal'/);
assert.match(home, /alternateName:/);
assert.match(home, /url: `\$\{origin\}\/`/);

const articlePage = await source('app/article/[slug]/page.tsx');
assert.match(articlePage, /<time dateTime=\{article\.publishedAt\}>/);
assert.match(articlePage, /formatArticleDateTime\(article\.publishedAt\)/);
assert.match(articlePage, /isAccessibleForFree: true/);

const content = await source('lib/content.ts');
assert.match(content, /export function formatArticleDateTime/);
assert.match(content, /timeZoneName: 'short'/);

const sitemap = await source('app/sitemap.ts');
assert.match(sitemap, /const articleTemplateModified = new Date\('/);
assert.match(sitemap, /const homepageTemplateModified = new Date\('/);
assert.match(
  sitemap,
  /lastModified: laterDate\(publicationModified, homepageTemplateModified\)/,
);
assert.match(
  sitemap,
  /new Date\(effectiveArticleUpdatedAt\(article\)\),\s+articleTemplateModified/,
);

const canonicalRoutes = new Map([
  ['app/page.tsx', '/'],
  ['app/about/page.tsx', '/about'],
  ['app/standards/page.tsx', '/standards'],
  ['app/corrections/page.tsx', '/corrections'],
  ['app/contact/page.tsx', '/contact'],
  ['app/privacy/page.tsx', '/privacy'],
  ['app/search/page.tsx', '/search'],
]);

for (const [file, canonical] of canonicalRoutes) {
  const content = await source(file);
  assert.match(
    content,
    new RegExp(`canonical:\\s*['"]${canonical.replaceAll('/', '\\/')}['"]`),
    `${file} must declare its own canonical URL.`,
  );
}

const author = await source('app/authors/kyle-langford/page.tsx');
assert.match(author, /canonical:\s*KYLE_LANGFORD_AUTHOR\.path/);

const section = await source('app/section/[section]/page.tsx');
assert.match(
  section,
  /canonical:\s*`\/section\/\$\{section\.toLowerCase\(\)\}`/,
);
assert.match(section, /if \(!sectionExists\(section, articles\)\) notFound\(\)/);
// A desk that exists only in the data must not 404 its own live stories.
assert.match(section, /published\.some\(\(item\) => item\.section\.toLowerCase\(\) === wanted\)/);

const search = await source('app/search/page.tsx');
assert.match(search, /robots:\s*{\s*index:\s*false,\s*follow:\s*true\s*}/);

console.log('Journal canonical metadata checks passed.');
