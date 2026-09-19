import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import {
  BriefingPreviewBuilder,
  type BriefingPreviewStory,
} from '@/components/briefing-preview-builder';
import { NewsletterForm } from '@/components/newsletter-form';
import { listPublished } from '@/lib/repository';

const origin = process.env.SITE_URL || 'https://www.goldencoastjournal.com';

export const metadata: Metadata = {
  title: 'Build your California briefing',
  description:
    'Preview a concise briefing from The Golden Coast Journal by choosing the California, business, climate and technology desks you read.',
  alternates: { canonical: '/briefing' },
  openGraph: {
    type: 'website',
    url: '/briefing',
    title: 'Build your California briefing',
    description:
      'Choose the desks you read and preview a concise briefing from the Journal’s published reporting.',
    images: ['/og.png'],
  },
};

export const revalidate = 900;

export default async function BriefingPage() {
  const articles = await listPublished();
  const stories: BriefingPreviewStory[] = articles.slice(0, 12).map((article) => ({
    slug: article.slug,
    section: article.section,
    title: article.title,
    dek: article.dek,
    readingMinutes: article.readingMinutes,
    imageUrl: article.imageUrl,
    imageAlt: article.imageAlt,
  }));
  const sections = Array.from(new Set(stories.map((story) => story.section))).slice(
    0,
    6,
  );
  const pageJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Build your California briefing',
    description:
      'A browser-local preview assembled from reporting published by The Golden Coast Journal.',
    url: `${origin}/briefing`,
    isPartOf: { '@id': `${origin}/#organization` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: stories.slice(0, 6).map((story, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${origin}/article/${story.slug}`,
        name: story.title,
      })),
    },
  }).replace(/</g, '\\u003c');

  return (
    <main>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: pageJson }}
      />
      <header className="briefing-page-hero shell">
        <p className="eyebrow">Reader briefing</p>
        <h1>Build a calmer way into the news.</h1>
        <p>
          Choose the desks you care about, then preview three current stories.
          The builder uses published Journal reporting and keeps your choices on
          your device.
        </p>
      </header>
      <div className="shell briefing-page-body">
        <BriefingPreviewBuilder sections={sections} stories={stories} />
      </div>
      <section
        id="briefing-newsletter"
        className="briefing-newsletter"
        aria-labelledby="briefing-newsletter-title"
      >
        <div className="shell briefing-newsletter-inner">
          <div>
            <p className="eyebrow">Optional next step</p>
            <h2 id="briefing-newsletter-title">Continue the briefing.</h2>
            <p>
              Join the launch list for concise Journal editions and major
              California updates. Your briefing selections are not attached to
              your email address.
            </p>
          </div>
          <NewsletterForm placement="briefing" />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
