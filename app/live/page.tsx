import type { Metadata } from 'next';
import { connection } from 'next/server';
import { LiveNewsroom, type LiveNewsStory } from '@/components/live-newsroom';
import { ReaderPulse } from '@/components/reader-pulse';
import { NewsletterForm } from '@/components/newsletter-form';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { listDevelopingSignals, listPublished } from '@/lib/repository';

const origin = process.env.SITE_URL || 'https://www.goldencoastjournal.com';

export const metadata: Metadata = {
  title: 'California Live Desk',
  description:
    'Follow The Golden Coast Journal live source monitor; scan current Journal reporting and official California developments in one reader-controlled desk.',
  alternates: { canonical: '/live' },
  openGraph: {
    type: 'website',
    url: '/live',
    title: 'California Live Desk',
    description:
      'Current Journal reporting and official California source signals in one reader-controlled desk.',
    images: ['/og.png'],
  },
};

export default async function LivePage() {
  await connection();
  const [articles, signals] = await Promise.all([
    listPublished(),
    listDevelopingSignals(6),
  ]);
  const journalStories: LiveNewsStory[] = articles.slice(0, 6).map((article) => ({
    id: `journal-${article.id}`,
    kind: 'journal',
    title: article.title,
    dek: article.dek,
    href: `/article/${article.slug}`,
    section: article.section,
    source: 'The Golden Coast Journal',
    publishedAt: article.publishedAt,
  }));
  const sourceStories: LiveNewsStory[] = signals.map((signal) => ({
    id: `source-${signal.id}`,
    kind: 'official-source',
    title: signal.title,
    dek: `A current signal from ${signal.sourceName}; open the primary material for the full context.`,
    href: signal.url,
    section: signal.section,
    source: signal.sourceName,
    publishedAt: signal.publishedAt || signal.discoveredAt,
  }));
  const stories = [
    ...journalStories.slice(0, 2),
    ...sourceStories.slice(0, 3),
    ...journalStories.slice(2),
    ...sourceStories.slice(3),
  ].slice(0, 10);
  const updatedAt = new Date().toISOString();
  const pageJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'California Live Desk',
    url: `${origin}/live`,
    description:
      'A reader-controlled monitor of current Journal reporting and official-source signals.',
    isPartOf: { '@id': `${origin}/#organization` },
    dateModified: updatedAt,
  }).replace(/</g, '\\u003c');

  return (
    <main className="live-page">
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: pageJson }}
      />
      <div className="shell live-page-intro">
        <p className="eyebrow">The California desk</p>
        <p>
          A continuously refreshed view of what the Journal has reported and
          what trusted primary sources are publishing now.
        </p>
      </div>
      <div className="shell live-page-body">
        <LiveNewsroom
          stories={stories}
          updatedAt={updatedAt}
          sourceCount={signals.length}
        />
      </div>
      <div className="shell live-page-poll">
        <ReaderPulse pollId="briefing-format-2026-09" compact />
      </div>
      <section className="live-page-newsletter">
        <div className="shell live-page-newsletter-inner">
          <div>
            <p className="eyebrow">Take the desk with you</p>
            <h2>The signal; with the context that matters.</h2>
            <p>
              Get the Journal briefing in your inbox; free, measured, and
              designed for readers who value their time.
            </p>
          </div>
          <NewsletterForm placement="live" />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
