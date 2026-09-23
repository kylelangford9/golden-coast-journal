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
import { OfficialChip } from '@/components/official-chip';
import { MiniBroadcast } from '@/components/mini-broadcast';
import { StoryDeck } from '@/components/story-deck';
import { listDevelopingSignals, listPublished } from '@/lib/repository';
import { selectEditorialAsset } from '@/lib/editorial-assets';
import { findMentionedOfficials, peopleInTheNews } from '@/lib/people';
import { PersonPortrait } from '@/components/person-card';
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
  const [lead] = articles;
  // A single deck at the top of the page carries the lead and everything
  // behind it, so the reader can thumb the whole front page from one stack.
  const deckStories = articles.slice(0, 12);
  // The first official each story names, so a face appears at first mention.
  const deckOfficials = await Promise.all(
    deckStories.map(async (article) =>
      (await findMentionedOfficials(`${article.title} ${article.dek}`, 1))[0] || null,
    ),
  );
  const leadImage = editorialAssetForArticle(lead);
  // Faces of the week: the people named in the most stories of the last seven
  // days, widening to thirty on a quiet week so the row is never a lone face.
  const weekPeople = await peopleInTheNews(7, 8);
  const inTheNews =
    weekPeople.length >= 4 ? weekPeople : await peopleInTheNews(30, 8);
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
        <div className="shell">
          <MiniBroadcast
            items={deckStories.slice(0, 8).map((article) => ({
              title: article.title,
              href: `/article/${article.slug}`,
              section: article.section,
              imageUrl: article.imageUrl,
            }))}
          />
        </div>
      </div>

      <section
        className="shell top-stories"
        aria-label="Across the Golden Coast"
      >
        <StoryDeck label="Across the Golden Coast">
          {deckStories.map((article, index) => (
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
              <OfficialChip official={deckOfficials[index]} />
              <p>{article.dek}</p>
              <span>
                <ArticleTime article={article} separator="after" />
                {article.readingMinutes} min read
              </span>
            </article>
          ))}
        </StoryDeck>
      </section>

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

      {inTheNews.length ? (
        <section
          className="shell people-strip"
          aria-labelledby="people-strip-title"
        >
          <div className="people-strip-heading">
            <div>
              <p className="eyebrow">In the news</p>
              <h2 id="people-strip-title">
                {weekPeople.length >= 4
                  ? 'Who the Journal covered this week'
                  : 'Who the Journal covered this month'}
              </h2>
            </div>
            <Link href="/people" className="people-strip-all">
              Everyone we cover <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
          <ul>
            {inTheNews.map((person) => (
              <li key={person.slug}>
                <Link href={`/people/${person.slug}`}>
                  <PersonPortrait person={person} size={64} />
                  <strong>{person.name}</strong>
                  <small>{person.office}</small>
                  <em>
                    {person.stories === 1 ? '1 story' : `${person.stories} stories`}
                  </em>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="newsletter-band" id="newsletter">
        <div className="shell newsletter-band-inner">
          <div>
            <p className="eyebrow">Reader briefing</p>
            <Link className="briefing-preview-link" href="/briefing">
              See a sample briefing <ArrowRight size={14} />
            </Link>
          </div>
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
          <NewsletterForm>
            <CaliforniaPulseMap />
          </NewsletterForm>
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



      <SiteFooter />
    </main>
  );
}
