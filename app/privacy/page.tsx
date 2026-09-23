import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'Privacy practices at The Golden Coast Journal.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <main>
      <SiteHeader />
      <article className="institutional shell">
        <p className="eyebrow">Privacy</p>
        <h1>Collect less. Explain it clearly.</h1>
        <p className="standfirst">
          The Journal does not run advertising trackers. We use privacy-light
          first-party measurement to understand whether readers find and use the
          publication. If you join a newsletter, we store the email address you
          provide solely to deliver and manage that publication.
        </p>
        <div className="institutional-grid">
          <section>
            <h2>What we collect</h2>
            <p>
              Newsletter email addresses, basic security logs, page paths,
              referral and campaign labels, and an ephemeral per-tab session
              identifier. Audience measurement does not store IP addresses,
              cookies or a durable cross-site identifier.
            </p>
          </section>
          <section>
            <h2>Your location</h2>
            <p>
              News near Me asks your browser for your location only when you
              tap it. Your device rounds it to about a kilometer before sending
              it to the Journal, which uses it once to name the nearest town and
              choose the stories, then discards it. It is not stored, logged or
              shared with a mapping service.
            </p>
          </section>
          <section>
            <h2>What we do not do</h2>
            <p>
              We do not sell personal information, build advertising profiles or
              require an account to read the news.
            </p>
          </section>
          <section>
            <h2>Retention</h2>
            <p>
              Subscription records are kept while a subscription is pending or
              active, and removed after an unsubscribe request is processed.
            </p>
          </section>
          <section>
            <h2>Your choices</h2>
            <p>
              You may read the publication without subscribing. Use the direct{' '}
              <Link href="/contact">publisher contact</Link> for a privacy or
              newsletter-removal request.
            </p>
          </section>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
