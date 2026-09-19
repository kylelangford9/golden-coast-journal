import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { StoryDeck } from '@/components/story-deck';
import { SiteFooter } from '@/components/site-footer';
import { ArticleTime } from '@/components/article-time';
import { sections } from '@/lib/content';
import { listPublished } from '@/lib/repository';
import { editorialAssetLabel, editorialAssetForArticle } from '@/lib/imagery';

type SectionProps = { params: Promise<{ section: string }> };

/**
 * A desk exists if it is on the masthead, or if a published story is filed
 * under it.
 *
 * The list alone was not enough. An article in the database carrying a section
 * that is not in `sections` renders its own section name on the page, links to
 * /section/<that name>, and lands the reader on a 404. That is an orphan
 * created by a single row, and it stays invisible until someone clicks it.
 * Following the data instead means a live story can never link into nothing.
 */
function sectionExists(slug: string, published: { section: string }[]) {
  const wanted = slug.toLowerCase();
  return (
    sections.some((item) => item.toLowerCase() === wanted) ||
    published.some((item) => item.section.toLowerCase() === wanted)
  );
}

export async function generateMetadata({
  params,
}: SectionProps): Promise<Metadata> {
  const { section } = await params;
  const title = section.charAt(0).toUpperCase() + section.slice(1);
  const articles = await listPublished();
  const hasOwnStories = articles.some(
    (item) => item.section.toLowerCase() === section.toLowerCase(),
  );
  if (!sectionExists(section, articles)) {
    return { title: 'Section not found', robots: { index: false } };
  }
  return {
    title,
    description: `Latest ${title} reporting and analysis from The Golden Coast Journal.`,
    alternates: { canonical: `/section/${section.toLowerCase()}` },
    // An empty desk shows four stories borrowed from other desks. Fine for a reader who
    // lands on it, a near-duplicate of those desks for a crawler. Index it once it has
    // reporting of its own.
    ...(hasOwnStories ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function SectionPage({ params }: SectionProps) {
  const { section } = await params;
  const title = section.charAt(0).toUpperCase() + section.slice(1);
  const articles = await listPublished();
  if (!sectionExists(section, articles)) notFound();
  const direct = articles.filter(
    (item) => item.section.toLowerCase() === section.toLowerCase(),
  );
  const stories = direct.length
    ? direct
    : articles.filter((item) => item.section !== title).slice(0, 4);

  return (
    <main>
      <SiteHeader />
      <header className="section-hero shell">
        <p className="eyebrow">Section</p>
        <h1>{title}</h1>
        <p>
          {direct.length
            ? `The latest reporting and analysis from our ${title} desk.`
            : `Our ${title} desk is opening soon. Start with today’s essential reporting.`}
        </p>
      </header>
      <section className="section-list shell" aria-label={`${title} stories`}>
        <StoryDeck label={`${title} stories`} perView={2}>
        {stories.map((article, index) => (
          <article className="section-story" key={article.slug}>
            <div>
              <span className="story-index">0{index + 1}</span>
              <p className="eyebrow">{article.section}</p>
              <h2>
                <Link href={`/article/${article.slug}`}>{article.title}</Link>
              </h2>
              <p>{article.dek}</p>
              <span className="source-note">
                <ArticleTime article={article} separator="after" />
                By {article.author} · {article.readingMinutes} min
              </span>
            </div>
            <Link href={`/article/${article.slug}`} className="section-image photo-frame ratio-card">
              <Image
                src={article.imageUrl}
                alt={article.imageAlt}
                fill
                sizes="(max-width: 700px) 100vw, 34vw"
              />
              <span className="photo-caption">
                {editorialAssetLabel(
                  editorialAssetForArticle(article),
                )}{' '}
                · {editorialAssetForArticle(article).credit}
              </span>
            </Link>
          </article>
        ))}
        </StoryDeck>
      </section>
      <SiteFooter />
    </main>
  );
}
