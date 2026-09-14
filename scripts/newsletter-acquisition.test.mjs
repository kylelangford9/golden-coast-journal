import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homepage = readFileSync('app/page.tsx', 'utf8');
const form = readFileSync('components/newsletter-form.tsx', 'utf8');
const header = readFileSync('components/site-header.tsx', 'utf8');
const headerCta = readFileSync('components/newsletter-cta-link.tsx', 'utf8');
const article = readFileSync('app/article/[slug]/page.tsx', 'utf8');
const route = readFileSync('app/api/newsletter/route.ts', 'utf8');
const electionCalendar = readFileSync('components/election-calendar-download.tsx', 'utf8');
const electionRoute = readFileSync('app/calendar/california-2026-general-election.ics/route.ts', 'utf8');
const briefingPage = readFileSync('app/briefing/page.tsx', 'utf8');
const briefingBuilder = readFileSync('components/briefing-preview-builder.tsx', 'utf8');
const sitemap = readFileSync('app/sitemap.ts', 'utf8');

const newsletterPosition = homepage.indexOf('id="newsletter"');
const liveDeskPosition = homepage.indexOf('id="live-desk"');
assert.ok(newsletterPosition > 0, 'homepage newsletter must have a stable anchor');
assert.ok(
  newsletterPosition < liveDeskPosition,
  'homepage newsletter must appear immediately after the lead story',
);
assert.equal(
  homepage.match(/<NewsletterForm \/>/g)?.length,
  1,
  'homepage must contain one signup form rather than competing duplicate forms',
);
assert.ok(form.includes('Get the briefing'));
assert.ok(form.includes('Primary sources'));
assert.ok(form.includes("'newsletter_submit_attempted'"));
assert.ok(form.includes("'Newsletter Submit Attempted'"));
assert.ok(form.includes('onChange={(event)'));
assert.ok(!form.includes('onFocus={()'));
assert.ok(form.includes("if (created && !form.get('website'))"));
assert.ok(form.includes("trackPortfolioGrowth('newsletter_signup'"));
assert.ok(form.includes("trackPortfolioGrowth(eventName, metadata)"));
assert.ok(form.includes("'newsletter_form_viewed'"));
assert.ok(form.includes("'newsletter_intent_started'"));
assert.ok(form.includes('window.sessionStorage.getItem(key)'));
assert.ok(!form.includes("form.get('email'), metadata"));
assert.ok(route.includes("{ onConflict: 'email', ignoreDuplicates: true }"));
assert.ok(header.includes('<NewsletterCtaLink />'));
assert.ok(headerCta.includes('Subscribe free'));
assert.ok(headerCta.includes("trackPortfolioGrowth('newsletter_cta_clicked'"));
assert.ok(headerCta.includes('window.sessionStorage.getItem(CHECKPOINT_KEY)'));
assert.ok(headerCta.includes("pathname.startsWith('/article/')"));
assert.ok(article.includes('id="newsletter"'));
assert.ok(article.includes('<ElectionCalendarDownload />'));
assert.ok(header.includes("'Election Calendar'"));
assert.ok(electionCalendar.includes("trackPortfolioGrowth('election_calendar_downloaded'"));
assert.ok(electionCalendar.includes('window.sessionStorage.getItem(checkpointKey)'));
assert.ok(electionRoute.includes("'Content-Type': 'text/calendar; charset=utf-8'"));
assert.ok(homepage.includes('href="/briefing"'));
assert.ok(header.includes("'Briefing Preview'"));
assert.ok(briefingPage.includes('alternates: { canonical: \'/briefing\' }'));
assert.ok(briefingPage.includes('<NewsletterForm placement="briefing" />'));
assert.ok(briefingPage.includes('Your briefing selections are not attached'));
assert.ok(briefingBuilder.includes("'briefing_preview_started'"));
assert.ok(briefingBuilder.includes("'briefing_preview_built'"));
assert.ok(briefingBuilder.includes("'briefing_signup_selected'"));
assert.ok(briefingBuilder.includes('window.sessionStorage.getItem(key)'));
assert.ok(!briefingBuilder.includes('selected.join'));
assert.ok(!briefingBuilder.includes('trackPortfolioGrowth(eventName, { selected'));
assert.ok(sitemap.includes("'/briefing'"));

console.log('PASS Journal signup funnel, private briefing preview, and qualified conversion tracking');
