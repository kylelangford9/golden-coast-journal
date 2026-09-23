import type { Metadata } from 'next';
import { peopleInStory } from '@/lib/people';
import { OfficialMentions } from '@/components/official-mentions';
import { MentionParagraph, PersonCards } from '@/components/person-card';
import { PersonCardTracker } from '@/components/person-card-tracker';
import { PhotoProvenance } from '@/components/photo-provenance';
import { findAssetByUrl } from '@/lib/editorial-assets';
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
import {
  findPublishedBySlug,
  listCorrections,
  listPublished,
} from '@/lib/repository';
import { editorialAssetLabel, editorialAssetForArticle } from '@/lib/imagery';
import {
  KYLE_LANGFORD_AUTHOR,
  KYLE_LANGFORD_PROFILES,
  kyleLangfordPersonId,
} from '@/lib/editorial-voice';

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
  // Everyone the story names, in the order it names them, with where the body
  // first names each: that is where their card opens. The rail shows up to
  // four faces, because a bill story routinely names an author, a co-author and
  // the governor, and showing only the first implies the others were not there.
  const [people, corrections, imageAsset] = await Promise.all([
    peopleInStory(article),
    listCorrections(article.id),
    findAssetByUrl(article.imageUrl),
  ]);
  const officials = people
    .filter((person) => person.photoUrl)
    .slice(0, 4)
    .map((person) => ({
      name: person.name,
      office: person.office,
      party: person.party,
      level: person.level,
      photoUrl: person.photoUrl as string,
      url: person.url,
      slug: person.slug,
      inBody: Boolean(person.firstBodyMention),
    }));
  const marksByParagraph = new Map<
    number,
    { start: number; end: number; slug: string }[]
  >();
  for (const person of people) {
    const at = person.firstBodyMention;
    if (!at) continue;
    const marks = marksByParagraph.get(at.paragraph) || [];
    // Two people can be named in overlapping words only by a register quirk;
    // the first keeps the button rather than nesting one inside another.
    if (!marks.some((mark) => at.start < mark.end && mark.start < at.end))
      marks.push({ start: at.start, end: at.end, slug: person.slug });
    marksByParagraph.set(at.paragraph, marks);
  }
  const linkedPeople = people.filter((person) =>
    [...marksByParagraph.values()].some((marks) =>
      marks.some((mark) => mark.slug === person.slug),
    ),
  );
  const approvedImage = editorialAssetForArticle(article);
  const articles = await listPublished();
  // Related stories should not hand the reader a photograph they are already
  // looking at. Prefer candidates whose picture differs from the hero and from
  // each other, then backfill in the ordinary order if the registry cannot
  // supply three distinct ones, so the rail is never short.
  const relatedCandidates = articles.filter(
    (item) => item.slug !== article.slug,
  );
  const usedImages = new Set([article.imageUrl]);
  const related = [];
  for (const item of relatedCandidates) {
    if (related.length === 3) break;
    if (usedImages.has(item.imageUrl)) continue;
    usedImages.add(item.imageUrl);
    related.push(item);
  }
  for (const item of relatedCandidates) {
    if (related.length === 3) break;
    if (!related.includes(item)) related.push(item);
  }
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
    // The picture with its credit and the page its licence was read on, so a
    // search engine can show who made it and under what terms.
    image: [
      {
        '@type': 'ImageObject',
        url: articleImageUrl,
        caption: approvedImage.alt,
        creditText: approvedImage.credit,
        ...(imageAsset?.provenance_url
          ? {
              license: imageAsset.provenance_url,
              acquireLicensePage: imageAsset.provenance_url,
            }
          : {}),
      },
    ],
    // The people the story names, each tied to their page on the Journal and
    // to the office that speaks for them.
    ...(people.length
      ? {
          mentions: people.map((person) => ({
            '@type': 'Person',
            name: person.name,
            jobTitle: person.office,
            url: `${origin}/people/${person.slug}`,
            ...(person.url ? { sameAs: [person.url] } : {}),
          })),
        }
      : {}),
    author: isKyleLangford
      ? {
          '@type': 'Person',
          // The same @id the author page defines, so every article names one
          // node rather than describing a fresh person each time. `url` stays
          // the author page because that is where this byline is canonical,
          // and `sameAs` is the corroboration: records maintained elsewhere
          // that the byline belongs to an identifiable person.
          '@id': kyleLangfordPersonId(origin),
          name: article.author,
          url: `${origin}${KYLE_LANGFORD_AUTHOR.path}`,
          sameAs: [...KYLE_LANGFORD_PROFILES],
        }
      : { '@type': 'Organization', name: article.author },
    // Point at the newsroom node in the root layout rather than restating a
    // bare Organization. The restated copy carried no logo, so the pages that
    // matter most to a news index were the ones describing their publisher
    // without one; every other page already references this id.
    publisher: { '@id': `${origin}/#organization` },
    ...(corrections.length
      ? {
          correction: corrections.map((correction) => ({
            '@type': 'CorrectionComment',
            text: correction.note,
            datePublished: correction.correctedAt,
          })),
        }
      : {}),
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
            <PhotoProvenance
              label={editorialAssetLabel(approvedImage)}
              alt={approvedImage.alt}
              credit={approvedImage.credit}
              provenanceUrl={
                imageAsset?.provenance_url || approvedImage.provenanceUrl || null
              }
            />
          </figcaption>
        </figure>
        <div className="article-layout shell">
          <OfficialMentions officials={officials} />
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
              <MentionParagraph
                key={index}
                text={paragraph}
                marks={marksByParagraph.get(index) || []}
              />
            ))}
            <PersonCards people={linkedPeople} />
            <PersonCardTracker articleSlug={article.slug} />
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
            {corrections.length ? (
              // The standards page promises the date and substance of every
              // material correction on the story itself, not a silent rewrite.
              <section
                className="article-corrections"
                aria-labelledby="corrections-heading"
              >
                <h2 id="corrections-heading">
                  {corrections.length > 1 ? 'Corrections' : 'Correction'}
                </h2>
                {corrections.map((correction) => (
                  <p key={correction.id}>
                    <time dateTime={correction.correctedAt}>
                      {formatArticleDateTime(correction.correctedAt)}
                    </time>{' '}
                    {correction.note}
                  </p>
                ))}
              </section>
            ) : null}
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
