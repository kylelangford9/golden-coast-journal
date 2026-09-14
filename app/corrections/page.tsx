import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'Corrections',
  description: 'Corrections and clarifications from The Golden Coast Journal.',
  alternates: { canonical: '/corrections' },
};

export default function CorrectionsPage() {
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
        <section className="corrections-empty">
          <span>Current record</span>
          <h2>No material corrections have been posted.</h2>
          <p>
            If you believe a report needs review, include the headline, the
            specific passage and a link to supporting evidence. Contact details
            will be added with the publication’s domain.
          </p>
          <Link href="/standards">Read our editorial standards</Link>
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}
