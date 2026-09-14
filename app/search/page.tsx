import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ArticleTime } from '@/components/article-time';
import {
  editorialAssetLabel,
  getApprovedEditorialAsset,
} from '@/lib/imagery';
import { listPublished } from '@/lib/repository';

type SearchProps = { searchParams: Promise<{ q?: string }> };

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search reporting from The Golden Coast Journal.',
  alternates: { canonical: '/search' },
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: SearchProps) {
  const { q = '' } = await searchParams;
  const articles = await listPublished();
  const needle = q.trim().toLowerCase();
  const results = needle
    ? articles.filter((article) =>
        [article.title, article.dek, article.section, ...article.body]
          .join(' ')
          .toLowerCase()
          .includes(needle),
      )
    : [];
  return (
    <main>
      <SiteHeader />
      <section className="search-page shell">
        <p className="eyebrow">Journal archive</p>
        <h1>Search</h1>
        <form action="/search" className="search-page-form">
          <Search size={21} />
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search stories…"
            aria-label="Search stories"
          />
          <button type="submit">Search</button>
        </form>
        <p className="result-count">
          {needle
            ? `${results.length} result${results.length === 1 ? '' : 's'} for “${q}”`
            : 'Enter a topic, place or headline.'}
        </p>
        <div className="search-results">
          {results.map((article) => (
            <article key={article.slug}>
              <div>
                <p className="eyebrow">{article.section}</p>
                <h2>
                  <Link href={`/article/${article.slug}`}>{article.title}</Link>
                </h2>
                <p>{article.dek}</p>
                <span className="source-note">
                  <ArticleTime article={article} separator="after" />
                  {article.readingMinutes} min read
                </span>
              </div>
              <Link
                href={`/article/${article.slug}`}
                className="search-image photo-frame ratio-card"
                aria-hidden
                tabIndex={-1}
              >
                <Image
                  src={article.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 700px) 100vw, 30vw"
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
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
