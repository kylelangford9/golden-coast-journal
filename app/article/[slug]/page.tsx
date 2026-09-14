import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { NewsletterForm } from '@/components/newsletter-form';
import { ArticleShare } from '@/components/article-share';
import { ElectionCalendarDownload } from '@/components/election-calendar-download';
import { DeadlineHubLink } from '@/components/deadline-hub-link';
import { PropositionGuideLink } from '@/components/proposition-guide-link';
import { CandidateGuideLink } from '@/components/candidate-guide-link';
import { ReaderPulse } from '@/components/reader-pulse';
import {
  effectiveArticleUpdatedAt,
  formatArticleDateTime,
} from '@/lib/content';
import { findPublishedBySlug, listPublished } from '@/lib/repository';
import { editorialAssetLabel, getApprovedEditorialAsset } from '@/lib/imagery';
import { KYLE_LANGFORD_AUTHOR } from '@/lib/editorial-voice';

type ArticlePageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await findPublishedBySlug(slug);
  if (!article) return { title: 'Story not found' };
  const articlePath = `/article/${article.slug}`;
  return {
    title: article.title,
    description: article.dek,
    alternates: { canonical: articlePath },
    openGraph: {
      type: 'article',
      url: articlePath,
      title: article.title,
      description: article.dek,
      publishedTime: article.publishedAt,
      modifiedTime: effectiveArticleUpdatedAt(article),
      authors: [article.author],
      images: [{ url: article.imageUrl, alt: article.imageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.dek,
      images: [article.imageUrl],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await findPublishedBySlug(slug);
  if (!article) notFound();
  const approvedImage = getApprovedEditorialAsset(article.imageUrl);
  const articles = await listPublished();
  const related = articles
    .filter((item) => item.slug !== article.slug)
    .slice(0, 3);
  const origin = process.env.SITE_URL || 'https://www.goldencoastjournal.com';
  const isKyleLangford = article.author === KYLE_LANGFORD_AUTHOR.name;
  const articleImageUrl = new URL(article.imageUrl, origin).toString();
  const supportsDeadlineTracker = [
    'california-2026-general-election-deadlines',
    'california-tax-extension-deadline-2026-october-15',
    'track-california-mail-ballot-2026-fix-problems',
    'california-minimum-wage-2027-rate-exempt-salary',
    'california-voter-guide-2026-mailing-state-county',
  ].includes(article.slug);
  const newsArticleJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.dek,
    datePublished: article.publishedAt,
    dateModified: effectiveArticleUpdatedAt(article),
    mainEntityOfPage: `${origin}/article/${article.slug}`,
    image: [articleImageUrl],
    author: isKyleLangford
      ? {
          '@type': 'Person',
          name: article.author,
          url: `${origin}${KYLE_LANGFORD_AUTHOR.path}`,
        }
      : { '@type': 'Organization', name: article.author },
    publisher: {
      '@type': 'Organization',
      name: 'The Golden Coast Journal',
      url: origin,
    },
    isAccessibleForFree: true,
    articleSection: article.section,
  }).replace(/</g, '\\u003c');

  return (
    <main>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: newsArticleJson }}
      />
      <article className="article-page">
        <header className="article-header shell">
          <Link href="/" className="back-link">
            <ArrowLeft size={15} /> Back to latest
          </Link>
          <p className="eyebrow">{article.section}</p>
          <h1>{article.title}</h1>
          <p className="article-dek">{article.dek}</p>
          <div className="article-meta">
            <span>
              By{' '}
              <strong>
                {isKyleLangford ? (
                  <Link href={KYLE_LANGFORD_AUTHOR.path}>{article.author}</Link>
                ) : (
                  article.author
                )}
              </strong>
            </span>
            <time dateTime={article.publishedAt}>
              Published {formatArticleDateTime(article.publishedAt)}
            </time>
            <span>{article.readingMinutes} min read</span>
          </div>
          <ArticleShare
            origin={origin}
            slug={article.slug}
            title={article.title}
          />
        </header>
        <figure className="article-hero shell photo-frame ratio-hero">
          <Image
            src={approvedImage.url}
            alt={approvedImage.alt}
            fill
            priority
            sizes="(max-width: 1480px) 100vw, 1420px"
          />
          <figcaption>
            {editorialAssetLabel(approvedImage)} ·{' '}
            <a
              href={approvedImage.provenanceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {approvedImage.credit}
            </a>
          </figcaption>
        </figure>
        <div className="article-layout shell">
          <aside className="key-points" aria-label="Key points">
            <strong>What to know</strong>
            <ul>
              {article.keyPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </aside>
          <div className="article-body">
            {article.body.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {article.slug === 'california-2026-general-election-deadlines' && (
              <ElectionCalendarDownload />
            )}
            {supportsDeadlineTracker && (
              <DeadlineHubLink articleSlug={article.slug} />
            )}
            {article.slug === 'california-2026-general-election-deadlines' && (
              <section className="proposition-hub-callout">
                <div>
                  <p className="eyebrow">Next step</p>
                  <h2>Review all 14 statewide propositions.</h2>
                  <p>
                    Search by number or issue, compare what yes and no mean and
                    mark each measure reviewed without sending your list
                    anywhere.
                  </p>
                </div>
                <PropositionGuideLink placement="article" />
              </section>
            )}
            {article.slug ===
              'california-voter-guide-2026-mailing-state-county' && (
              <>
                <section className="proposition-hub-callout">
                  <div>
                    <p className="eyebrow">Review the guide</p>
                    <h2>Separate the statewide and local ballot.</h2>
                    <p>
                      Start with the statewide propositions and candidates; use
                      the official county guide for local races and measures.
                    </p>
                  </div>
                  <div className="article-election-actions">
                    <PropositionGuideLink placement="article" />
                    <CandidateGuideLink placement="article" />
                  </div>
                </section>
                <ReaderPulse
                  pollId="voter-guide-help-priority-2026"
                  compact
                />
              </>
            )}
            <section className="source-box" aria-labelledby="sources-heading">
              <h2 id="sources-heading">Sources & methodology</h2>
              <p>
                This report was written from the primary materials below. Links
                open at the original publisher.
              </p>
              {article.sources.map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.name} <ExternalLink size={13} />
                </a>
              ))}
            </section>
            <p className="correction-note">
              See something we should correct? Read our{' '}
              <Link href="/corrections">corrections policy</Link>.
            </p>
          </div>
        </div>
      </article>
      <section
        id="newsletter"
        className="article-newsletter"
        aria-labelledby="article-newsletter-title"
      >
        <div className="shell article-newsletter-inner">
          <div>
            <p className="eyebrow">Continue the briefing</p>
            <h2 id="article-newsletter-title">
              California, clearly explained.
            </h2>
            <p>
              Get the next briefing; concise California reporting,
              primary-source links and no advertising trackers. Free.
            </p>
          </div>
          <NewsletterForm placement="article" articleSlug={article.slug} />
        </div>
      </section>
      <section className="related shell">
        <div className="section-heading">
          <h2>Keep reading</h2>
        </div>
        <div className="brief-grid">
          {related.map((item) => (
            <article className="brief-card" key={item.slug}>
              <p className="eyebrow">{item.section}</p>
              <h3>
                <Link href={`/article/${item.slug}`}>{item.title}</Link>
              </h3>
              <p>{item.dek}</p>
            </article>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
