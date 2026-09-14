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
assert.match(contact, /kyle@kylelangford\.org/);
assert.match(contact, /correction/);
assert.match(contact, /privacy request/);
assert.match(contact, /unsubscribe/);
assert.match(contact, /not a secure tip line/);
assert.doesNotMatch(contact, /—/);
assert.match(corrections, /href="\/contact"/);
assert.doesNotMatch(corrections, /Contact details\s+will be added/);
assert.match(privacy, /href="\/contact"/);
assert.doesNotMatch(privacy, /will be added with the final/);
assert.match(layout, /'@type': 'ContactPoint'/);
assert.match(layout, /url: `\$\{origin\}\/contact`/);
assert.match(sitemap, /'\/contact'/);
assert.match(header, /href="\/contact"/);
assert.match(footer, /href="\/contact"/);

console.log('PASS Journal publisher contact and accountability path');
