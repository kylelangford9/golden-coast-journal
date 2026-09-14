import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ArticleTime } from '@/components/article-time';
import { sections } from '@/lib/content';
import { listPublished } from '@/lib/repository';
import { editorialAssetLabel, getApprovedEditorialAsset } from '@/lib/imagery';

type SectionProps = { params: Promise<{ section: string }> };

export async function generateMetadata({
  params,
}: SectionProps): Promise<Metadata> {
  const { section } = await params;
  const title = section.charAt(0).toUpperCase() + section.slice(1);
  const isKnown = sections.some(
    (item) => item.toLowerCase() === section.toLowerCase(),
  );
  if (!isKnown) return { title: 'Section not found', robots: { index: false } };
  return {
    title,
    description: `Latest ${title} reporting and analysis from The Golden Coast Journal.`,
    alternates: { canonical: `/section/${section.toLowerCase()}` },
  };
}

export default async function SectionPage({ params }: SectionProps) {
  const { section } = await params;
  const title = section.charAt(0).toUpperCase() + section.slice(1);
  const isKnown = sections.some(
    (item) => item.toLowerCase() === section.toLowerCase(),
  );
  if (!isKnown) notFound();
  const articles = await listPublished();
  const direct = articles.filter(
    (item) => item.section.toLowerCase() === title.toLowerCase(),
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
            <Link href={`/article/${article.slug}`} className="section-image">
              <Image
                src={article.imageUrl}
                alt={article.imageAlt}
                fill
                sizes="(max-width: 700px) 100vw, 34vw"
              />
              <span className="photo-caption">
                {editorialAssetLabel(
                  getApprovedEditorialAsset(article.imageUrl),
                )}{' '}
                · {getApprovedEditorialAsset(article.imageUrl).credit}
              </span>
            </Link>
          </article>
        ))}
      </section>
      <SiteFooter />
    </main>
  );
}
