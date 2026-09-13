import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const primary = 'https://www.goldencoastjournal.com';
const legacyHost = 'golden-coast-journal.vercel.app';
const canonicalFiles = [
  '.env.example',
  'app/layout.tsx',
  'app/page.tsx',
  'app/sitemap.ts',
  'app/robots.ts',
  'app/feed.xml/route.ts',
  'app/news-sitemap.xml/route.ts',
  'app/article/[slug]/page.tsx',
  'lib/pipeline.ts',
];

for (const file of canonicalFiles) {
  const source = readFileSync(file, 'utf8');
  assert.ok(source.includes(primary), `${file} must use the custom domain`);
  assert.ok(!source.includes(legacyHost), `${file} must not publish the legacy host`);
}

const config = readFileSync('next.config.ts', 'utf8');
assert.ok(config.includes(legacyHost));
assert.ok(config.includes(`${primary}/:path*`));
assert.ok(config.includes("value: 'goldencoastjournal.com'"));

console.log('PASS Journal canonical domain and legacy redirects are consistent');
