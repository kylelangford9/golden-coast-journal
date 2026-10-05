import type { Metadata } from 'next';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';

const publisherEmail = 'kyle@goldencoastjournal.com';

export const metadata: Metadata = {
  title: 'Contact the Journal',
  description:
    'Contact The Golden Coast Journal about corrections, source material, privacy or newsletter removal.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <main>
      <SiteHeader />
      <article className="institutional shell">
        <p className="eyebrow">Contact the Journal</p>
        <h1>Point to the exact line.</h1>
        <p className="standfirst">
          Kyle Langford is the publisher and accountable editor. The direct
          publisher address is{' '}
          <a href={`mailto:${publisherEmail}`}>{publisherEmail}</a>.
        </p>
        <div className="institutional-grid">
          <section>
            <h2>Corrections</h2>
            <p>
              Include the story URL, the exact passage at issue and the source
              that supports your concern. We review the record; material changes
              stay attached to the article.
            </p>
            <a
              href={`mailto:${publisherEmail}?subject=Golden%20Coast%20Journal%20correction`}
            >
              Request a correction review
            </a>
          </section>
          <section>
            <h2>Source material</h2>
            <p>
              Send the public record, agency page or attributable material that
              should be examined. This address is not a secure tip line; do not
              send confidential records, passwords or sensitive personal data.
            </p>
            <a
              href={`mailto:${publisherEmail}?subject=Golden%20Coast%20Journal%20source`}
            >
              Share a public source
            </a>
          </section>
          <section>
            <h2>Privacy</h2>
            <p>
              Name the privacy request and the email address it concerns. Do not
              include identification documents or unrelated personal details.
            </p>
            <a
              href={`mailto:${publisherEmail}?subject=Golden%20Coast%20Journal%20privacy%20request`}
            >
              Send a privacy request
            </a>
          </section>
          <section>
            <h2>Newsletter removal</h2>
            <p>
              Ask to remove the address that joined the launch list. We use it
              only to identify and process the requested subscription record.
            </p>
            <a
              href={`mailto:${publisherEmail}?subject=Golden%20Coast%20Journal%20unsubscribe`}
            >
              Request newsletter removal
            </a>
          </section>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
