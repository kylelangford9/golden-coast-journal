import type { Metadata } from 'next';
import { connection } from 'next/server';
import { DeadlineTracker } from '@/components/deadline-tracker';
import { NewsletterForm } from '@/components/newsletter-form';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { californiaDeadlines } from '@/lib/california-deadlines';

const origin = process.env.SITE_URL || 'https://www.goldencoastjournal.com';

export const metadata: Metadata = {
  title: 'California Deadlines 2026; Election, Tax and Wage Dates',
  description:
    'Track current California election, tax and workplace dates for 2026 and early 2027; filter the list, open official sources and add the dates to your calendar.',
  alternates: { canonical: '/california-deadlines' },
  openGraph: {
    type: 'website',
    url: '/california-deadlines',
    title: 'California Deadlines 2026; Election, Tax and Wage Dates',
    description:
      'A sourced, filterable calendar of California election, tax and workplace dates.',
    images: ['/og.png'],
  },
};

function pacificDate() {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Los_Angeles',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export default async function CaliforniaDeadlinesPage() {
  await connection();
  const today = pacificDate();
  const references = Array.from(
    new Map(
      californiaDeadlines.flatMap((deadline) =>
        deadline.sources.map((source) => [source.url, source]),
      ),
    ).values(),
  );
  const pageJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'California Deadlines 2026; Election, Tax and Wage Dates',
    url: `${origin}/california-deadlines`,
    dateModified: '2026-09-14',
    isPartOf: { '@id': `${origin}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: californiaDeadlines.length,
      itemListElement: californiaDeadlines.map((deadline, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: deadline.title,
        url: `${origin}/california-deadlines#${deadline.id}`,
      })),
    },
  }).replace(/</g, '\\u003c');

  return (
    <main className="deadlines-page">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: pageJson }}
      />
      <header className="shell deadlines-hero">
        <p className="eyebrow">A working California calendar</p>
        <h1>California deadlines; without the scavenger hunt.</h1>
        <p>
          Election, tax and workplace dates that may change what Californians
          need to do next; each entry links to the agency record behind it.
        </p>
        <div className="deadlines-meta">
          <span>Verified September 14, 2026</span>
          <span>{californiaDeadlines.length} dates and changes</span>
          <span>Pacific time</span>
        </div>
      </header>

      <div className="shell deadlines-body">
        <DeadlineTracker deadlines={californiaDeadlines} today={today} />
      </div>

      <section className="deadline-method">
        <div className="shell deadline-method-grid">
          <div>
            <p className="eyebrow">How to use this page</p>
            <h2>A reminder is not the final authority.</h2>
          </div>
          <div>
            <p>
              This page translates statewide source material into a practical
              sequence. It does not replace county instructions, individual tax
              advice, workplace-specific rules or a notice issued directly to
              you.
            </p>
            <p>
              The Journal distinguishes firm deadlines, start dates,
              recommended dates and scheduled changes. When circumstances vary,
              the entry says so and sends readers to the responsible agency.
            </p>
          </div>
        </div>
      </section>

      <section className="shell deadline-references" aria-labelledby="deadline-references-title">
        <p className="eyebrow">Primary record</p>
        <h2 id="deadline-references-title">Sources and references</h2>
        <ol>
          {references.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.name}
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="deadline-newsletter" id="newsletter">
        <div className="shell deadline-newsletter-inner">
          <div>
            <p className="eyebrow">The useful dates; in context</p>
            <h2>Know what changed before a deadline gets expensive.</h2>
            <p>
              Join the free Journal briefing for concise California reporting,
              visible sources and no advertising trackers.
            </p>
          </div>
          <NewsletterForm placement="deadlines" />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
