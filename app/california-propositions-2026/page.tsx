import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { NewsletterForm } from '@/components/newsletter-form';
import { PropositionGuide } from '@/components/proposition-guide';
import { ReaderPulse } from '@/components/reader-pulse';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import {
  californiaPropositions,
  propositionGuideVerifiedAt,
} from '@/lib/california-propositions';

const origin = process.env.SITE_URL || 'https://www.goldencoastjournal.com';

export const metadata: Metadata = {
  title: 'California Propositions 2026; What Props 1 Through 45 Do',
  description:
    'Search all 14 California propositions on the November 2026 ballot; compare what yes and no mean, fiscal effects and official voter-guide sources.',
  alternates: { canonical: '/california-propositions-2026' },
  openGraph: {
    type: 'website',
    url: '/california-propositions-2026',
    title: 'California Propositions 2026; What Props 1 Through 45 Do',
    description:
      'A neutral, searchable guide to all 14 statewide measures on California’s November 2026 ballot.',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'California Propositions 2026; What Props 1 Through 45 Do',
    description:
      'Search all 14 statewide measures; see what yes and no mean and open the official analysis.',
    images: ['/og.png'],
  },
};

export default function CaliforniaPropositionsPage() {
  const pageJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'California Propositions 2026; What Props 1 Through 45 Do',
    url: `${origin}/california-propositions-2026`,
    dateModified: propositionGuideVerifiedAt,
    isPartOf: { '@id': `${origin}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: californiaPropositions.length,
      itemListElement: californiaPropositions.map((proposition, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: `Proposition ${proposition.number}: ${proposition.officialTitle}`,
        url: `${origin}/california-propositions-2026#proposition-${proposition.number}`,
      })),
    },
  }).replace(/</g, '\\u003c');

  return (
    <main className="propositions-page">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: pageJson }}
      />

      <header className="shell propositions-hero">
        <p className="eyebrow">November 3, 2026 general election</p>
        <h1>California propositions; all 14 in one working guide.</h1>
        <p>
          Search the ballot, check what yes and no mean and open the state’s
          full analysis. The Journal does not make endorsements on this page;
          the job here is to make the official record easier to use.
        </p>
        <div className="propositions-meta">
          <span>Verified September 14, 2026</span>
          <span>{californiaPropositions.length} statewide measures</span>
          <span>Checklist stays in your browser</span>
        </div>
      </header>

      <div className="shell propositions-body">
        <PropositionGuide propositions={californiaPropositions} />
      </div>

      <section className="proposition-method">
        <div className="shell proposition-method-grid">
          <div>
            <p className="eyebrow">How this guide works</p>
            <h2>Plain language; the official record stays attached.</h2>
          </div>
          <div>
            <p>
              Every measure below is on the Secretary of State’s certified list.
              The short descriptions translate the official summary, yes and no
              consequences and fiscal effect; they do not replace the complete
              analysis or proposed law.
            </p>
            <p>
              Marking a proposition reviewed does not record a position. The
              list is saved only in this browser and is not sent to the Journal
              or the portfolio scorecard.
            </p>
            <p>
              State propositions are only one part of a ballot. Candidate
              contests and local measures depend on the voter’s address; use the
              official candidate statements and county guide for those races.
            </p>
          </div>
        </div>
      </section>

      <section className="shell proposition-pulse">
        <ReaderPulse pollId="proposition-explainer-priority-2026" />
      </section>

      <section
        className="shell proposition-references"
        aria-labelledby="proposition-references-title"
      >
        <p className="eyebrow">Primary record</p>
        <h2 id="proposition-references-title">Sources and references</h2>
        <div className="proposition-reference-intro">
          <p>
            California certified 14 measures for the November ballot; five came
            from the Legislature and nine qualified through petition signatures.
          </p>
          <a
            href="https://www.sos.ca.gov/administration/news-releases-and-advisories/2026-news-releases-and-advisories/california-secretary-state-shirley-n-weber-phd-certifies-measures-november-3-2026-general-election-ballot"
            target="_blank"
            rel="noreferrer"
          >
            Read the certification <ExternalLink aria-hidden="true" />
          </a>
        </div>
        <ol>
          {californiaPropositions.map((proposition) => (
            <li key={proposition.number}>
              <a
                href={proposition.officialUrl}
                target="_blank"
                rel="noreferrer"
              >
                Proposition {proposition.number}: official summary, analysis,
                arguments and proposed law
              </a>
            </li>
          ))}
          <li>
            <a
              href="https://voterguide.sos.ca.gov/candidates/"
              target="_blank"
              rel="noreferrer"
            >
              California Secretary of State: statewide candidate statements
            </a>
          </li>
          <li>
            <a
              href="https://www.fppc.ca.gov/transparency/top-contributors.html"
              target="_blank"
              rel="noreferrer"
            >
              California Fair Political Practices Commission: top contributors
            </a>
          </li>
        </ol>
        <p className="proposition-reference-note">
          Need voting dates instead? Use the Journal’s{' '}
          <Link href="/california-deadlines">California deadlines tracker</Link>
          .
        </p>
      </section>

      <section className="proposition-newsletter" id="newsletter">
        <div className="shell proposition-newsletter-inner">
          <div>
            <p className="eyebrow">The ballot; without the noise</p>
            <h2>Know what changed before the ballot arrives.</h2>
            <p>
              Join the free Journal briefing for sourced California reporting,
              practical voter information and no advertising trackers.
            </p>
          </div>
          <NewsletterForm placement="propositions" />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
