import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { AuthorProfileTracker } from '@/components/author-profile-tracker';
import { SiteFooter } from '@/components/site-footer';
import { editorialAssets, editorialAssetLabel } from '@/lib/imagery';
import { SiteHeader } from '@/components/site-header';
import { KYLE_LANGFORD_AUTHOR } from '@/lib/editorial-voice';

const origin = process.env.SITE_URL || 'https://www.goldencoastjournal.com';

export const metadata: Metadata = {
  title: KYLE_LANGFORD_AUTHOR.name,
  description:
    'Kyle Langford is the creator and publisher of The Golden Coast Journal.',
  alternates: { canonical: KYLE_LANGFORD_AUTHOR.path },
};

export default function KyleLangfordAuthorPage() {
  const portrait = editorialAssets.kyleLangfordPortrait;
  const personJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: KYLE_LANGFORD_AUTHOR.name,
    url: `${origin}${KYLE_LANGFORD_AUTHOR.path}`,
    image: `${origin}${editorialAssets.kyleLangfordPortrait.url}`,
    worksFor: {
      '@type': 'NewsMediaOrganization',
      '@id': `${origin}/#organization`,
      name: 'The Golden Coast Journal',
    },
  }).replace(/</g, '\\u003c');

  return (
    <main>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: personJson }}
      />
      <article className="institutional shell">
        <div className="author-masthead">
          <div>
            <p className="eyebrow">Publisher and author</p>
            <h1>Kyle Langford</h1>
            <p className="standfirst">
              Kyle Langford created and publishes The Golden Coast Journal. His
              articles use a direct, evidence-led voice: the verified news
              first, the strongest support next and the practical consequence
              after that.
            </p>
          </div>
          <figure className="author-portrait photo-frame ratio-portrait">
            <Image
              src={portrait.url}
              alt={portrait.alt}
              fill
              priority
              sizes="(max-width: 760px) 100vw, 340px"
            />
            <figcaption className="photo-caption">
              {editorialAssetLabel(portrait)} · {portrait.credit}
            </figcaption>
          </figure>
        </div>
        <div className="institutional-grid">
          <section>
            <h2>How he writes</h2>
            <p>
              Short declarative sentences, precise figures and visible caveats.
              The reporting separates what is known, what a source says and what
              remains uncertain.
            </p>
          </section>
          <section>
            <h2>How the work is made</h2>
            <p>
              Software may help monitor primary sources, organize material and
              prepare language in Kyle’s authorized voice. The source record,
              review standards and corrections policy still govern publication.
            </p>
          </section>
          <section>
            <h2>Accountability</h2>
            <p>
              A Kyle Langford byline identifies him as the accountable author
              and publisher. It does not imply an interview, eyewitness account
              or original reporting unless the article says so.
            </p>
          </section>
          <section>
            <h2>Editorial independence</h2>
            <p>
              The Journal is part of Kyle’s project network, but related
              products receive no editorial preference. Read the full{' '}
              <Link href="/standards">standards and AI policy</Link>.
            </p>
          </section>
        </div>
      </article>
      <AuthorProfileTracker />
      <SiteFooter />
    </main>
  );
}
