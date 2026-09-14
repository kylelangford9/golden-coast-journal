import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (file) => readFile(file, 'utf8');
const [data, page, tracker, calendarRoute, articlePage, header, footer, sitemap] =
  await Promise.all([
    read('lib/california-deadlines.ts'),
    read('app/california-deadlines/page.tsx'),
    read('components/deadline-tracker.tsx'),
    read('app/calendar/california-deadlines.ics/route.ts'),
    read('app/article/[slug]/page.tsx'),
    read('components/site-header.tsx'),
    read('components/site-footer.tsx'),
    read('app/sitemap.ts'),
  ]);

for (const date of [
  '2026-09-15',
  '2026-09-24',
  '2026-10-05',
  '2026-10-06',
  '2026-10-15',
  '2026-10-19',
  '2026-10-20',
  '2026-10-24',
  '2026-10-27',
  '2026-11-03',
  '2026-11-10',
  '2026-11-25',
  '2026-12-03',
  '2026-12-11',
  '2027-01-01',
  '2027-01-15',
]) {
  assert.ok(data.includes(`date: '${date}'`), `missing ${date}`);
}

for (const source of [
  'sos.ca.gov/elections/upcoming-elections/general-election-november-3-2026/key-dates-deadlines',
  'ftb.ca.gov/pay/estimated-tax-payments.html',
  'irs.gov/publications/p505',
  'dir.ca.gov/DIRNews/2026/2026-66.html',
]) {
  assert.ok(data.includes(source), `missing source ${source}`);
}

assert.match(data, /standard schedule assigns 0%/);
assert.match(data, /guidance, not a final cutoff/);
assert.match(data, /must be postmarked on or before November 3/);
assert.match(data, /security|county procedures can differ/i);
assert.match(data, /buildCaliforniaDeadlineCalendar/);
assert.match(calendarRoute, /text\/calendar/);

assert.match(page, /canonical: '\/california-deadlines'/);
assert.match(page, /ItemList/);
assert.match(page, /Sources and references/);
assert.match(page, /NewsletterForm placement="deadlines"/);

for (const eventName of [
  'deadline_tracker_opened',
  'deadline_filter_selected',
  'deadline_source_opened',
  'deadline_calendar_downloaded',
  'deadline_newsletter_selected',
]) {
  assert.ok(tracker.includes(eventName), `missing event ${eventName}`);
}
assert.doesNotMatch(tracker, /email|address|tax_amount|voter_status/i);

assert.match(articlePage, /DeadlineHubLink/);
assert.match(header, /'Deadlines'/);
assert.match(footer, /href="\/california-deadlines"/);
assert.match(sitemap, /'\/california-deadlines'/);

for (const [name, source] of [
  ['data', data],
  ['page', page],
  ['tracker', tracker],
]) {
  assert.doesNotMatch(source, /—/, `${name} contains an em dash`);
}

console.log('California deadline facts, sources, utility and metrics checks passed.');
