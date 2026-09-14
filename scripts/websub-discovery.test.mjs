import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [feed, notifier, editorialAction, pipeline] = await Promise.all([
  readFile('app/feed.xml/route.ts', 'utf8'),
  readFile('lib/websub.ts', 'utf8'),
  readFile('app/api/editorial/articles/[id]/route.ts', 'utf8'),
  readFile('lib/pipeline.ts', 'utf8'),
]);

assert.match(feed, /xmlns:atom="http:\/\/www\.w3\.org\/2005\/Atom"/);
assert.match(feed, /rel="hub"/);
assert.match(feed, /rel="self"/);
assert.match(feed, /link: `<\$\{WEB_SUB_HUB_URL\}>/);
assert.match(notifier, /'hub\.mode': 'publish'/);
assert.match(notifier, /'hub\.url': topic/);
assert.match(notifier, /AbortSignal\.timeout\(WEB_SUB_TIMEOUT_MS\)/);
assert.match(editorialAction, /result\.previous_status !== 'published'/);
assert.match(editorialAction, /result\.next_status === 'published'/);
assert.match(editorialAction, /await notifyWebSubHub\(\)/);
assert.match(pipeline, /if \(publish\) \{/);
assert.match(pipeline, /webSubNotifications/);
assert.match(pipeline, /webSubFailures/);

console.log('PASS Journal feed discovery and publication notification contract');
