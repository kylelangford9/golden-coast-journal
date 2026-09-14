import type { Metadata } from 'next';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { NewsletterForm } from '@/components/newsletter-form';
import { ReaderPulse } from '@/components/reader-pulse';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import {
  californiaPropositions,
  propositionGuideVerifiedAt,
} from '@/lib/california-propositions';

const origin = process.env.SITE_URL || 'https://www.goldencoastjournal.com';

type PropositionPageProps = {
  params: Promise<{ number: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return californiaPropositions.map((proposition) => ({
    number: proposition.number.toString(),
  }));
}

function findProposition(value: string) {
  if (!/^\d+$/.test(value)) return undefined;
  return californiaPropositions.find(
    (proposition) => proposition.number === Number(value),
  );
}

export async function generateMetadata({
  params,
}: PropositionPageProps): Promise<Metadata> {
  const { number } = await params;
  const proposition = findProposition(number);
  if (!proposition) return {};
  const path = `/california-propositions-2026/${proposition.number}`;
  const title = `California Proposition ${proposition.number} 2026; What Yes and No Mean`;
  const description = `California Proposition ${proposition.number}: ${proposition.shortTitle}. Compare what yes and no mean, fiscal effects and the official 2026 voter guide.`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      url: path,
      title,
      description,
      publishedTime: propositionGuideVerifiedAt,
      modifiedTime: propositionGuideVerifiedAt,
      authors: [`${origin}/authors/kyle-langford`],
      images: ['/og.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og.png'],
    },
  };
}

export default async function PropositionPage({
  params,
}: PropositionPageProps) {
  const { number } = await params;
  const proposition = findProposition(number);
  if (!proposition) return null;
  const index = californiaPropositions.findIndex(
    (item) => item.number === proposition.number,
  );
  const previous = californiaPropositions[index - 1];
  const next = californiaPropositions[index + 1];
  const pageUrl = `${origin}/california-propositions-2026/${proposition.number}`;
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${pageUrl}#article`,
        headline: `California Proposition ${proposition.number} 2026; what yes and no mean`,
        description: proposition.summary,
        datePublished: propositionGuideVerifiedAt,
        dateModified: propositionGuideVerifiedAt,
        isAccessibleForFree: true,
        mainEntityOfPage: pageUrl,
        author: {
          '@type': 'Person',
          name: 'Kyle Langford',
          url: `${origin}/authors/kyle-langford`,
        },
        publisher: { '@id': `${origin}/#organization` },
        about: {
          '@type': 'Thing',
          name: `California Proposition ${proposition.number}`,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'California propositions 2026',
            item: `${origin}/california-propositions-2026`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: `Proposition ${proposition.number}`,
            item: pageUrl,
          },
        ],
      },
    ],
  }).replace(/</g, '\\u003c');

  return (
    <main className="propositions-page proposition-detail-page">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />

      <article>
        <header className="shell proposition-detail-hero">
          <nav aria-label="Breadcrumb">
            <Link href="/california-propositions-2026">
              All 14 California propositions
            </Link>
            <span aria-hidden="true">/</span>
            <span>Proposition {proposition.number}</span>
          </nav>
          <p className="eyebrow">November 3, 2026 general election</p>
          <h1>
            California Proposition {proposition.number}; what a yes or no vote
            means.
          </h1>
          <p className="proposition-detail-dek">{proposition.summary}</p>
          <div className="proposition-detail-byline">
            <span>
              By <Link href="/authors/kyle-langford">Kyle Langford</Link>
            </span>
            <time dateTime={propositionGuideVerifiedAt}>
              Verified September 14, 2026
            </time>
          </div>
        </header>

        <div className="shell proposition-detail-layout">
          <div className="proposition-detail-copy">
            <section aria-labelledby="bottom-line">
              <p className="eyebrow">Bottom line</p>
              <h2 id="bottom-line">
                What Proposition {proposition.number} does
              </h2>
              <p>{proposition.summary}</p>
              <p>
                The measure is a {proposition.measureType.toLowerCase()} placed
                on the ballot by {proposition.placedBy.toLowerCase()}. Its
                official title is “{proposition.officialTitle}.”
              </p>
            </section>

            <section
              className="proposition-vote-effects"
              aria-label="Vote effects"
            >
              <div>
                <p className="eyebrow">A yes vote</p>
                <h2>Yes means</h2>
                <p>{proposition.yesMeans}</p>
              </div>
              <div>
                <p className="eyebrow">A no vote</p>
                <h2>No means</h2>
                <p>{proposition.noMeans}</p>
              </div>
            </section>

            <section aria-labelledby="fiscal-effect">
              <p className="eyebrow">State estimate</p>
              <h2 id="fiscal-effect">What it could cost</h2>
              <p>{proposition.fiscalEffect}</p>
              <p>
                That is the fiscal effect summarized from the state voter guide.
                Estimates describe likely government effects; they are not a
                promise of an exact future result.
              </p>
            </section>

            <section aria-labelledby="official-record">
              <p className="eyebrow">Primary record</p>
              <h2 id="official-record">Read the complete state analysis</h2>
              <p>
                This explainer is a starting point. The Secretary of State’s
                guide carries the impartial analysis, fiscal estimate, arguments
                for and against the measure, rebuttals and proposed law. Read
                that record before making a decision.
              </p>
              <a
                href={proposition.officialUrl}
                data-growth-event="proposition_official_source_opened"
                data-growth-surface="proposition_detail_page"
                data-growth-role={proposition.number}
                target="_blank"
                rel="noreferrer"
                className="proposition-official-link"
              >
                Open the official Proposition {proposition.number} guide{' '}
                <ExternalLink aria-hidden="true" />
              </a>
            </section>
          </div>

          <aside
            className="proposition-detail-facts"
            aria-label="Measure facts"
          >
            <p className="eyebrow">Measure file</p>
            <dl>
              <div>
                <dt>Official title</dt>
                <dd>{proposition.officialTitle}</dd>
              </div>
              <div>
                <dt>Measure type</dt>
                <dd>{proposition.measureType}</dd>
              </div>
              <div>
                <dt>Placed on ballot by</dt>
                <dd>{proposition.placedBy}</dd>
              </div>
              <div>
                <dt>Issues</dt>
                <dd>{proposition.topics.join('; ')}</dd>
              </div>
            </dl>
            <p>
              Neutral service guide; no endorsement. Facts last checked against
              California’s official voter guide on September 14, 2026.
            </p>
          </aside>
        </div>

        <nav
          className="shell proposition-detail-pagination"
          aria-label="Other propositions"
        >
          {previous ? (
            <Link href={`/california-propositions-2026/${previous.number}`}>
              <span>Previous measure</span>
              Proposition {previous.number}; {previous.shortTitle}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/california-propositions-2026/${next.number}`}>
              <span>Next measure</span>
              Proposition {next.number}; {next.shortTitle}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </article>

      <section className="shell proposition-pulse">
        <ReaderPulse pollId="proposition-explainer-priority-2026" compact />
      </section>

      <section className="proposition-newsletter" id="newsletter">
        <div className="shell proposition-newsletter-inner">
          <div>
            <p className="eyebrow">The ballot; without the noise</p>
            <h2>Keep the official record within reach.</h2>
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
