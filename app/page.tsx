import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { connection } from 'next/server';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { NewsletterForm } from '@/components/newsletter-form';
import { ArticleTime } from '@/components/article-time';
import { ReaderPulse } from '@/components/reader-pulse';
import { CandidateGuideLink } from '@/components/candidate-guide-link';
import { PropositionGuideLink } from '@/components/proposition-guide-link';
import { ElectionHubLink } from '@/components/election-hub';
import { HomepageStoryLink } from '@/components/homepage-story-link';
import { CaliforniaPulseMap } from '@/components/california-pulse-map';
import { StoryDeck } from '@/components/story-deck';
import { listDevelopingSignals, listPublished } from '@/lib/repository';
import { selectEditorialAsset } from '@/lib/editorial-assets';
import { formatArticleDate } from '@/lib/content';
import { editorialAssetLabel, editorialAssetForArticle } from '@/lib/imagery';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

const origin = process.env.SITE_URL || 'https://www.goldencoastjournal.com';

export default async function Home() {
  await connection();
  const [articles, rawDeveloping] = await Promise.all([
    listPublished(),
    listDevelopingSignals(5),
  ]);
  // A primary-source signal has no photograph of its own, so it borrows the
  // approved one its desk would use; the credit travels with it.
  const developing = await Promise.all(
    rawDeveloping.map(async (signal) => ({
      ...signal,
      asset: await selectEditorialAsset({
        section: signal.section,
        title: signal.title,
        rotationKey: signal.url,
      }),
    })),
  );
  const [lead, ...rest] = articles;
  const featurePair = rest.slice(0, 2);
  const latest = rest.slice(2);
  const leadImage = editorialAssetForArticle(lead);
  const [bandImage, promoImage] = await Promise.all([
    selectEditorialAsset({ section: 'California', rotationKey: 'homepage-newsletter-band' }),
    selectEditorialAsset({
      section: 'California',
      title: 'California 2026 election candidates propositions ballot deadlines',
      rotationKey: 'homepage-election-promo',
    }),
  ]);
  const websiteJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name: 'The Golden Coast Journal',
    alternateName: ['Golden Coast Journal', 'GCJ', 'goldencoastjournal.com'],
    url: `${origin}/`,
    publisher: { '@id': `${origin}/#organization` },
  }).replace(/</g, '\\u003c');
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: websiteJson }}
      />
      <a className="skip-link" href="#main-story">
        Skip to content
      </a>
      <SiteHeader />
      <div className="ticker">
        <div className="shell ticker-inner">
          <strong>Live desk</strong>
          <span>
            {developing[0]?.title ||
              'Read the latest published reporting from the Journal'}
          </span>
          {developing[0] ? (
            <a href={developing[0].url} target="_blank" rel="noreferrer">
              Official source <ExternalLink size={13} />
            </a>
          ) : (
            <Link href={`/article/${lead.slug}`}>
              Full report <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>

      <section className="shell lead-grid" id="main-story">
        <article className="lead-copy">
          <p className="eyebrow">The California Briefing</p>
          <h1>
            <HomepageStoryLink
              href={`/article/${lead.slug}`}
              articleSlug={lead.slug}
              surface="lead_headline"
            >
              {lead.title}
            </HomepageStoryLink>
          </h1>
          <p className="lead-dek">{lead.dek}</p>
          <HomepageStoryLink
            href={`/article/${lead.slug}`}
            articleSlug={lead.slug}
            surface="lead_cta"
            className="lead-read-link"
          >
            Read the full report <ArrowRight size={14} aria-hidden="true" />
          </HomepageStoryLink>
          <div className="byline-row">
            <Image
              className="byline-mark"
              src="/kyle-langford-avatar.jpg"
              alt="Kyle Langford"
              width={40}
              height={40}
            />
            <div>
              <p>By {lead.author}</p>
              <span>
                Updated {formatArticleDate(lead.updatedAt)} ·{' '}
                {lead.readingMinutes} min read
              </span>
            </div>
          </div>
        </article>
        <HomepageStoryLink
          href={`/article/${lead.slug}`}
          articleSlug={lead.slug}
          surface="lead_image"
          className="lead-visual photo-frame ratio-card"
          ariaLabel={`Read: ${lead.title}`}
        >
          <Image
            src={leadImage.url}
            alt={leadImage.alt}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 62vw"
          />
          <span className="photo-caption">
            {editorialAssetLabel(leadImage)} · {leadImage.credit}
          </span>
        </HomepageStoryLink>
      </section>

      <section className="newsletter-band" id="newsletter">
        <div className="shell newsletter-band-inner">
          <div>
            <p className="eyebrow">Reader briefing</p>
            <h2>
              California, with context.
              <br />
              A briefing worth opening.
            </h2>
            <p style={{ maxWidth: '36rem', lineHeight: 1.7, margin: '14px 0' }}>Useful California reporting, source links and practical guides in one reader briefing. See exactly what it includes before you subscribe.</p>
            <Link className="briefing-preview-link" href="/briefing">
              See a sample briefing <ArrowRight size={14} />
            </Link>
          </div>
          <CaliforniaPulseMap />
          <figure className="band-visual photo-frame ratio-card">
            <Image
              src={bandImage.url}
              alt={bandImage.alt}
              fill
              sizes="(max-width: 900px) 100vw, 520px"
              loading="lazy"
            />
            <figcaption className="photo-caption">
              {editorialAssetLabel(bandImage)} · {bandImage.credit}
            </figcaption>
          </figure>
          <NewsletterForm />
        </div>
      </section>

      <section
        className="shell proposition-promo"
        aria-labelledby="proposition-promo-title"
      >
        <div>
          <p className="eyebrow">2026 California election desk</p>
          <h2 id="proposition-promo-title">
            Candidates, propositions and the dates that change the plan.
          </h2>
          <p>
            Start with the statewide candidates; compare all 14 measures; then
            put registration, ballot and voting dates in order.
          </p>
        </div>
        <figure className="promo-visual photo-frame ratio-card">
          <Image
            src={promoImage.url}
            alt={promoImage.alt}
            fill
            sizes="(max-width: 900px) 100vw, 420px"
            loading="lazy"
          />
          <figcaption className="photo-caption">
            {editorialAssetLabel(promoImage)} · {promoImage.credit}
          </figcaption>
        </figure>
        <div className="election-promo-actions">
          <ElectionHubLink placement="homepage" />
          <CandidateGuideLink placement="homepage" />
          <PropositionGuideLink placement="homepage">
            Review propositions
          </PropositionGuideLink>
          <Link href="/california-deadlines">
            Check deadlines <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section
        className="live-desk shell"
        id="live-desk"
        aria-labelledby="live-desk-title"
      >
        <div className="live-desk-heading">
          <div>
            <p className="eyebrow">Source monitor</p>
            <h2 id="live-desk-title">Developing now</h2>
          </div>
          <p>
            Fresh signals from California, national, world, business, climate
            and science primary sources before the Journal’s reporting is
            complete.
          </p>
          <Link className="live-desk-link" href="/live">
            Open the live desk <ArrowRight size={14} />
          </Link>
        </div>
        {developing.length ? (
          <ol className="signal-list">
            {developing.map((signal, index) => (
              <li key={signal.id}>
                <span className="signal-index">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="signal-thumb photo-frame">
                  <Image src={signal.asset.url} alt="" fill sizes="96px" />
                </span>
                <div>
                  <a href={signal.url} target="_blank" rel="noreferrer">
                    {signal.title} <ExternalLink size={13} />
                  </a>
                  <p>
                    {signal.section} · {signal.sourceName}
                    {signal.publishedAt
                      ? ` · ${formatArticleDate(signal.publishedAt)}`
                      : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="signal-empty">
            <p>No new primary-source signals right now.</p>
            <p className="signal-empty-note">
              The desk re-checks California, national, world, business, climate
              and science sources every hour. Published reporting continues
              below.
            </p>
          </div>
        )}
      </section>

      <div className="shell homepage-reader-pulse">
        <ReaderPulse pollId="coverage-priority-2026-09" />
      </div>

      <section
        className="shell top-stories"
        aria-labelledby="top-stories-title"
      >
        <div className="section-heading">
          <h2 id="top-stories-title">Across the Golden Coast</h2>
          <p>Reporting that explains what changed and why it matters.</p>
        </div>
        <StoryDeck label="Across the Golden Coast" perView={2}>
          {featurePair.map((article) => (
            <article className="image-story" key={article.slug}>
              <Link
                href={`/article/${article.slug}`}
                className="image-frame photo-frame ratio-card"
              >
                <Image
                  src={article.imageUrl}
                  alt={article.imageAlt}
                  fill
                  sizes="(max-width: 760px) 100vw, 50vw"
                />
                <span className="photo-caption">
                  {editorialAssetLabel(
                    editorialAssetForArticle(article),
                  )}{' '}
                  · {editorialAssetForArticle(article).credit}
                </span>
              </Link>
              <p className="eyebrow">{article.section}</p>
              <h3>
                <Link href={`/article/${article.slug}`}>{article.title}</Link>
              </h3>
              <p>{article.dek}</p>
              <span>
                <ArticleTime article={article} separator="after" />
                {article.readingMinutes} min read
              </span>
            </article>
          ))}
        </StoryDeck>
      </section>

      <section
        className="shell briefing"
        id="latest"
        aria-labelledby="briefing-title"
      >
        <div className="section-heading">
          <h2 id="briefing-title">The Sunday Briefing</h2>
          <p>Essential reporting, without the noise.</p>
        </div>
        <StoryDeck label="The Sunday Briefing">
          {latest.map((article, index) => (
            <article className="brief-card" key={article.slug}>
              <Link
                href={`/article/${article.slug}`}
                className="brief-visual photo-frame ratio-card"
                aria-hidden="true"
                tabIndex={-1}
              >
                <Image
                  src={article.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 760px) 82vw, 33vw"
                />
                <span className="photo-caption">
                  {editorialAssetLabel(editorialAssetForArticle(article))} ·{' '}
                  {editorialAssetForArticle(article).credit}
                </span>
              </Link>
              <span className="brief-number">0{index + 1}</span>
              <p className="eyebrow">{article.section}</p>
              <h3>
                <Link href={`/article/${article.slug}`}>{article.title}</Link>
              </h3>
              <p>{article.dek}</p>
              <span className="source-note">
                <ArticleTime article={article} separator="after" />
                By {article.author} · {article.readingMinutes} min
              </span>
            </article>
          ))}
        </StoryDeck>
      </section>

      <SiteFooter />
    </main>
  );
}
