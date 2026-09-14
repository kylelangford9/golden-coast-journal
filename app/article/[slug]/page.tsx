import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { NewsletterForm } from '@/components/newsletter-form';
import { ArticleShare } from '@/components/article-share';
import { formatArticleDate } from '@/lib/content';
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
      modifiedTime: article.updatedAt,
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
  const newsArticleJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.dek,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
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
            <span>Published {formatArticleDate(article.publishedAt)}</span>
            <span>{article.readingMinutes} min read</span>
          </div>
          <ArticleShare
            origin={origin}
            slug={article.slug}
            title={article.title}
          />
        </header>
        <figure className="article-hero shell">
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
              Join the Journal’s launch list for concise editions—free, with no
              advertising trackers.
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
