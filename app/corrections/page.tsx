import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { formatArticleDateTime } from '@/lib/content';
import { listCorrections } from '@/lib/repository';

export const metadata: Metadata = {
  title: 'Corrections',
  description: 'Corrections and clarifications from The Golden Coast Journal.',
  alternates: { canonical: '/corrections' },
};

export default async function CorrectionsPage() {
  // The record lives in gcj_corrections and grows between deploys, so this
  // page is read per request rather than frozen at build time.
  await connection();
  const corrections = await listCorrections();
  return (
    <main>
      <SiteHeader />
      <article className="institutional shell">
        <p className="eyebrow">Corrections</p>
        <h1>The record should get better.</h1>
        <p className="standfirst">
          When we make a material error, we correct it promptly and explain the
          change on the story. Clarifications identify language that was
          accurate but incomplete or unclear.
        </p>
        {corrections.length ? (
          <section className="corrections-list" aria-label="Corrections">
            {corrections.map((correction) => (
              <article key={correction.id}>
                <time dateTime={correction.correctedAt}>
                  {formatArticleDateTime(correction.correctedAt)}
                </time>
                <h2>
                  <Link href={`/article/${correction.article.slug}`}>
                    {correction.article.title}
                  </Link>
                </h2>
                <p>{correction.note}</p>
              </article>
            ))}
          </section>
        ) : null}
        <section className="corrections-empty">
          <span>
            {corrections.length ? 'Report an error' : 'Current record'}
          </span>
          {corrections.length ? null : (
            <h2>No material corrections have been posted.</h2>
          )}
          <p>
            If you believe a report needs review, include the headline, the
            specific passage and a link to supporting evidence. Send it through
            the Journal’s direct <Link href="/contact">publisher contact</Link>.
          </p>
          <Link href="/standards">Read our editorial standards</Link>
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}
