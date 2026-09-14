import type { Metadata } from 'next';
import { ExternalLink } from 'lucide-react';
import { CandidateGuide } from '@/components/candidate-guide';
import { NewsletterForm } from '@/components/newsletter-form';
import { ReaderPulse } from '@/components/reader-pulse';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import {
  californiaCandidateCount,
  californiaCandidateOffices,
  candidateGuideVerifiedAt,
} from '@/lib/california-candidates';

const origin = process.env.SITE_URL || 'https://www.goldencoastjournal.com';

export const metadata: Metadata = {
  title: 'California Candidates 2026; Statewide Election Guide',
  description:
    'Search 24 candidates across the 2026 California statewide voter guide; see what each office does and open every official candidate-statement page.',
  alternates: { canonical: '/california-candidates-2026' },
  openGraph: {
    type: 'website',
    url: '/california-candidates-2026',
    title: 'California Candidates 2026; Statewide Election Guide',
    description:
      'A neutral, searchable guide to California statewide candidates, offices and official statements for the November 2026 election.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'California Candidates 2026; Statewide Election Guide',
    description:
      'Search candidates and offices; open the official statements and find the right district ballot tool.',
    images: ['/og.png'],
  },
};

export default function CaliforniaCandidatesPage() {
  const pageJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'California Candidates 2026; Statewide Election Guide',
    url: `${origin}/california-candidates-2026`,
    dateModified: candidateGuideVerifiedAt,
    isPartOf: { '@id': `${origin}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: californiaCandidateCount,
      itemListElement: californiaCandidateOffices.flatMap((office) =>
        office.candidates.map((candidate, index) => ({
          '@type': 'ListItem',
          position:
            californiaCandidateOffices
              .slice(0, californiaCandidateOffices.indexOf(office))
              .reduce((total, item) => total + item.candidates.length, 0) +
            index +
            1,
          name: `${candidate.name}; ${office.name}`,
          url: `${origin}/california-candidates-2026#${office.id}`,
        })),
      ),
    },
  }).replace(/</g, '\\u003c');

  return (
    <main className="candidates-page">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: pageJson }}
      />

      <header className="shell candidates-hero">
        <p className="eyebrow">November 3, 2026 general election</p>
        <h1>California candidates; the statewide guide in one place.</h1>
        <p>
          Search the names, learn what each office controls and open the
          candidate statements published by the Secretary of State. The Journal
          does not endorse candidates on this page.
        </p>
        <div className="candidates-meta">
          <span>Verified September 14, 2026</span>
          <span>{californiaCandidateCount} candidates</span>
          <span>{californiaCandidateOffices.length} office sections</span>
          <span>Checklist stays in your browser</span>
        </div>
      </header>

      <div className="shell candidates-body">
        <CandidateGuide offices={californiaCandidateOffices} />
      </div>

      <section className="candidate-method">
        <div className="shell candidate-method-grid">
          <div>
            <p className="eyebrow">What this guide covers</p>
            <h2>Names and duties here; campaign claims stay at the source.</h2>
          </div>
          <div>
            <p>
              This page follows the candidate sections in California’s official
              voter guide. It records each listed name, party label, office duty
              and whether the state page contains a submitted statement.
            </p>
            <p>
              The statements themselves come from the candidates. The state says
              they are voluntarily submitted, candidate-paid and not checked for
              accuracy by an official agency; the Journal links to them without
              republishing the campaign copy as verified fact.
            </p>
            <p>
              Congressional, legislative, judicial and local contests vary by
              district or county. Use the official county guide and a
              personalized ballot lookup before treating this as a complete
              ballot.
            </p>
          </div>
        </div>
      </section>

      <section className="shell candidate-pulse">
        <ReaderPulse pollId="candidate-office-explainer-priority-2026" />
      </section>

      <section
        className="shell candidate-references"
        aria-labelledby="candidate-references-title"
      >
        <p className="eyebrow">Primary record</p>
        <h2 id="candidate-references-title">Sources and references</h2>
        <div className="candidate-reference-intro">
          <p>
            The official guide separates statewide candidate statements by
            office. Board of Equalization candidates are further divided among
            four districts.
          </p>
          <a
            href="https://voterguide.sos.ca.gov/candidates/"
            target="_blank"
            rel="noreferrer"
          >
            Open the official candidate index{' '}
            <ExternalLink aria-hidden="true" />
          </a>
        </div>
        <ol>
          {californiaCandidateOffices.map((office) => (
            <li key={office.id}>
              <a href={office.officialUrl} target="_blank" rel="noreferrer">
                California Secretary of State: {office.name} candidate page
              </a>
            </li>
          ))}
          <li>
            <a
              href="https://www.sos.ca.gov/elections/upcoming-elections/general-election-november-3-2026"
              target="_blank"
              rel="noreferrer"
            >
              California Secretary of State: November 3 general election
              resources
            </a>
          </li>
          <li>
            <a
              href="https://www.sos.ca.gov/elections/voting-resources/county-elections-offices"
              target="_blank"
              rel="noreferrer"
            >
              California Secretary of State: county elections offices
            </a>
          </li>
        </ol>
      </section>

      <section className="candidate-newsletter" id="newsletter">
        <div className="shell candidate-newsletter-inner">
          <div>
            <p className="eyebrow">The election; without the noise</p>
            <h2>Follow the offices before the campaign claims.</h2>
            <p>
              Join the free Journal briefing for sourced California reporting,
              practical election information and no advertising trackers.
            </p>
          </div>
          <NewsletterForm placement="candidates" />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
