import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const contact = readFileSync('app/contact/page.tsx', 'utf8');
const corrections = readFileSync('app/corrections/page.tsx', 'utf8');
const privacy = readFileSync('app/privacy/page.tsx', 'utf8');
const layout = readFileSync('app/layout.tsx', 'utf8');
const sitemap = readFileSync('app/sitemap.ts', 'utf8');
const header = readFileSync('components/site-header.tsx', 'utf8');
const footer = readFileSync('components/site-footer.tsx', 'utf8');

assert.match(contact, /alternates: \{ canonical: '\/contact' \}/);
// The Journal answers from its own domain; the address is a Workspace alias
// that lands in the publisher's inbox.
assert.match(contact, /const publisherEmail = 'kyle@goldencoastjournal\.com'/);
assert.match(layout, /email: 'kyle@goldencoastjournal\.com'/);
assert.match(contact, /correction/);
assert.match(contact, /privacy request/);
assert.match(contact, /unsubscribe/);
assert.match(contact, /not a secure tip line/);
assert.doesNotMatch(contact, /—/);
assert.match(corrections, /href="\/contact"/);
assert.doesNotMatch(corrections, /Contact details\s+will be added/);

// The standards page promises that material corrections are attached to the
// story with their date and substance. Both surfaces have to read the record,
// not a hard-coded empty state.
const article = readFileSync('app/article/[slug]/page.tsx', 'utf8');
assert.match(corrections, /await listCorrections\(\)/);
assert.match(corrections, /await connection\(\)/, 'the record grows between deploys');
assert.match(corrections, /corrections\.length \? null : \(\s*<h2>No material corrections have been posted\.<\/h2>/);
assert.match(article, /listCorrections\(article\.id\)/);
assert.match(article, /className="article-corrections"/);
assert.match(article, /formatArticleDateTime\(correction\.correctedAt\)/);
assert.match(article, /'@type': 'CorrectionComment'/);
assert.match(privacy, /href="\/contact"/);
assert.doesNotMatch(privacy, /will be added with the final/);
assert.match(layout, /'@type': 'ContactPoint'/);
assert.match(layout, /url: `\$\{origin\}\/contact`/);
assert.match(sitemap, /'\/contact'/);
assert.match(header, /href="\/contact"/);
assert.match(footer, /href="\/contact"/);

console.log('PASS Journal publisher contact and accountability path');
