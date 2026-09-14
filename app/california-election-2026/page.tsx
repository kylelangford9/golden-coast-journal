import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { ElectionHub } from '@/components/election-hub';
import { NewsletterForm } from '@/components/newsletter-form';
import { ReaderPulse } from '@/components/reader-pulse';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { californiaCandidateCount } from '@/lib/california-candidates';
import { californiaPropositions } from '@/lib/california-propositions';

const origin = process.env.SITE_URL || 'https://www.goldencoastjournal.com';

export const metadata: Metadata = {
  title: 'California Election 2026 Voter Guide; Candidates, Props and Dates',
  description:
    'Use the 2026 California election guide for statewide candidates, all 14 propositions, registration and ballot dates, official sources and a personalized ballot path.',
  alternates: { canonical: '/california-election-2026' },
  openGraph: {
    type: 'website',
    url: '/california-election-2026',
    title: 'California Election 2026 Voter Guide',
    description:
      'Candidates, propositions, dates, official sources and a private path to a personalized California ballot.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'California Election 2026 Voter Guide',
    description:
      'Candidates, propositions, dates and official California election sources in one working guide.',
    images: ['/og.png'],
  },
};

const electionDates = [
  {
    isoDate: '2026-10-05',
    date: 'October 5',
    title: 'Ballots begin mailing',
    detail: 'County officials begin mailing vote-by-mail ballots; early voting begins.',
  },
  {
    isoDate: '2026-10-19',
    date: 'October 19',
    title: 'Standard registration deadline',
    detail: 'Conditional registration remains available after the standard deadline.',
  },
  {
    isoDate: '2026-10-24',
    date: 'October 24',
    title: 'First vote centers open',
    detail: "The first centers open in participating Voter's Choice Act counties.",
  },
  {
    isoDate: '2026-11-03',
    date: 'November 3',
    title: 'Election Day',
    detail: 'Polls are open from 7 a.m. to 8 p.m.; ballot return rules still apply.',
  },
] as const;

export default function CaliforniaElectionPage() {
  const pageJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'California Election 2026 Voter Guide',
    url: `${origin}/california-election-2026`,
    dateModified: '2026-09-14',
    isPartOf: { '@id': `${origin}/#organization` },
    about: {
      '@type': 'Event',
      name: 'California General Election',
      startDate: '2026-11-03',
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'AdministrativeArea',
        name: 'California',
      },
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: 4,
      itemListElement: [
        'California candidates',
        'California propositions',
        'California election deadlines',
        'Personalized ballot lookup',
      ].map((name, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name,
      })),
    },
  }).replace(/</g, '\\u003c');

  return (
    <main className="election-page">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: pageJson }}
      />

      <header className="shell election-hero">
        <div className="election-hero-copy">
          <p className="eyebrow">California General Election; November 3, 2026</p>
          <h1>The ballot is long; the path through it can be clear.</h1>
          <p>
            Start with the statewide offices and measures every California voter
            should know; then move to the official record and the ballot tied to
            your address.
          </p>
        </div>
        <dl className="election-hero-facts">
          <div>
            <dt>{californiaCandidateCount}</dt>
            <dd>names in the statewide candidate guide</dd>
          </div>
          <div>
            <dt>{californiaPropositions.length}</dt>
            <dd>statewide propositions</dd>
          </div>
          <div>
            <dt>7 a.m.</dt>
            <dd>polls open on Election Day</dd>
          </div>
        </dl>
        <p className="election-verification">
          Verified September 14, 2026; official state and county sources remain
          authoritative.
        </p>
      </header>

      <div className="shell election-body">
        <ElectionHub />

        <section className="election-timeline" aria-labelledby="election-dates-title">
          <div className="election-section-heading">
            <div>
              <p className="eyebrow">Dates to hold</p>
              <h2 id="election-dates-title">The short calendar.</h2>
            </div>
            <p>
              These are the statewide anchors; county schedules and individual
              ballot problems can require a different next step.
            </p>
          </div>
          <ol>
            {electionDates.map((item) => (
              <li key={item.date}>
                <time dateTime={item.isoDate}>
                  {item.date}
                </time>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link className="election-timeline-link" href="/california-deadlines">
            Open every election deadline
          </Link>
        </section>
      </div>

      <section className="election-method">
        <div className="shell election-method-grid">
          <div>
            <p className="eyebrow">What this page does</p>
            <h2>Orientation here; decisions stay with the voter.</h2>
          </div>
          <div>
            <p>
              The Journal&apos;s guides translate the structure of the official
              record; they do not endorse a candidate or a vote on this page.
              Candidate statements remain campaign claims and are linked at the
              state source.
            </p>
            <p>
              The statewide guide is not a complete personal ballot. Congress,
              the Legislature, judges, county offices, city contests and local
              measures depend on district and county boundaries.
            </p>
            <p>
              Address-based lookup happens at California Voters under its own
              privacy policy; the Journal does not receive the address. Check the
              county voter guide before treating any list as final.
            </p>
          </div>
        </div>
      </section>

      <section className="shell election-reader-pulse">
        <ReaderPulse pollId="election-help-priority-2026" />
      </section>

      <section className="shell election-references" aria-labelledby="election-references-title">
        <p className="eyebrow">Primary record</p>
        <h2 id="election-references-title">Sources and references</h2>
        <ol>
          <li>
            <a href="https://voterguide.sos.ca.gov/" target="_blank" rel="noreferrer">
              California Secretary of State; Official Voter Information Guide{' '}
              <ExternalLink aria-hidden="true" />
            </a>
          </li>
          <li>
            <a href="https://www.sos.ca.gov/elections/upcoming-elections/general-election-november-3-2026" target="_blank" rel="noreferrer">
              California Secretary of State; November 3 general election resources{' '}
              <ExternalLink aria-hidden="true" />
            </a>
          </li>
          <li>
            <a href="https://www.sos.ca.gov/elections/voting-resources/voting-california/election-dates-and-resources" target="_blank" rel="noreferrer">
              California Secretary of State; election dates and resources{' '}
              <ExternalLink aria-hidden="true" />
            </a>
          </li>
        </ol>
      </section>

      <section className="election-newsletter" id="newsletter">
        <div className="shell election-newsletter-inner">
          <div>
            <p className="eyebrow">The election; without the noise</p>
            <h2>Know what changed before the ballot arrives.</h2>
            <p>
              Join the free Journal briefing for sourced California reporting,
              practical voter information and no advertising trackers.
            </p>
          </div>
          <NewsletterForm placement="election-hub" />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
