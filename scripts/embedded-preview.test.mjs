import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = readFileSync('next.config.ts', 'utf8');
const route = readFileSync('app/embed/latest/route.ts', 'utf8');

assert.ok(!config.includes("X-Frame-Options', value: 'DENY'"));
assert.ok(
  config.includes(
    "frame-ancestors 'self' https://kylelangford.org https://www.kylelangford.org",
  ),
);
assert.ok(route.includes("export const dynamic = 'force-dynamic'"));
assert.ok(route.includes("'Cache-Control': 'no-store'"));
assert.ok(route.includes("'X-Robots-Tag': 'noindex, nofollow, noarchive'"));
assert.ok(route.includes('await listPublished()'));
assert.ok(!route.includes('growth.js'));
assert.ok(!route.includes('@vercel/analytics'));

console.log('PASS latest-story embed is live, private and metrics-safe');
