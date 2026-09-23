import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { PersonPortrait, levelLabel } from '@/components/person-card';
import { formatArticleDate } from '@/lib/content';
import { findPersonCoverage } from '@/lib/people';

type PersonPageProps = { params: Promise<{ slug: string }> };

const origin = process.env.SITE_URL || 'https://www.goldencoastjournal.com';

export async function generateMetadata({
  params,
}: PersonPageProps): Promise<Metadata> {
  const { slug } = await params;
  const person = await findPersonCoverage(slug);
  if (!person) return { title: 'Person not found' };
  const count = person.stories.length;
  const description = `${person.office}. ${count} ${count === 1 ? 'story' : 'stories'} in The Golden Coast Journal name ${person.name}.`;
  return {
    title: person.name,
    description,
    alternates: { canonical: `/people/${person.slug}` },
    openGraph: {
      type: 'profile',
      url: `/people/${person.slug}`,
      title: `${person.name} in The Golden Coast Journal`,
      description,
      images: person.photoUrl
        ? [{ url: person.photoUrl, alt: person.name }]
        : undefined,
    },
  };
}

/**
 * Everything the Journal has reported about one person: the page every card,
 * chip and rail entry for them leads to. It lists only published stories that
 * name them by the same rules that put their face beside a story, so it can
 * never claim coverage the reader cannot find.
 */
export default async function PersonPage({ params }: PersonPageProps) {
  const { slug } = await params;
  const person = await findPersonCoverage(slug);
  if (!person) notFound();

  const count = person.stories.length;
  const latest = person.stories[0];
  const pageJson = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${person.name} in The Golden Coast Journal`,
    url: `${origin}/people/${person.slug}`,
    about: {
      '@type': 'Person',
      name: person.name,
      jobTitle: person.office,
      ...(person.photoUrl
        ? {
            image: {
              '@type': 'ImageObject',
              url: person.photoUrl,
              ...(person.portrait
                ? { creditText: person.portrait.credit }
                : {}),
              ...(person.portrait?.provenanceUrl
                ? {
                    license: person.portrait.provenanceUrl,
                    acquireLicensePage: person.portrait.provenanceUrl,
                  }
                : {}),
            },
          }
        : {}),
      ...(person.url ? { sameAs: [person.url] } : {}),
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: person.stories.map((story, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${origin}/article/${story.slug}`,
        name: story.title,
      })),
    },
    publisher: { '@id': `${origin}/#organization` },
  }).replace(/</g, '\\u003c');

  return (
    <main>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: pageJson }}
      />
      <article className="person-page shell">
        <Link href="/people" className="back-link">
          <ArrowLeft size={15} /> People in the Journal
        </Link>
        <header className="person-hero">
          <figure className="person-hero-figure">
            <PersonPortrait
              person={person}
              size={168}
              className="person-hero-portrait"
              eager
            />
            {person.portrait ? (
              <figcaption>
                {person.portrait.credit}
                {person.portrait.license ? ` · ${person.portrait.license}` : ''}
                {person.portrait.provenanceUrl ? (
                  <>
                    {' · '}
                    <a
                      href={person.portrait.provenanceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Source
                    </a>
                  </>
                ) : null}
              </figcaption>
            ) : null}
          </figure>
          <div className="person-hero-copy">
            <p className="eyebrow">{levelLabel(person.level)}</p>
            <h1>{person.name}</h1>
            <p className="person-office">
              {person.office}
              {person.party ? ` · ${person.party}` : ''}
            </p>
            <p className="person-stat">
              Named in <strong>{count}</strong>{' '}
              {count === 1 ? 'Journal story' : 'Journal stories'}
              {latest
                ? `, most recently ${formatArticleDate(latest.publishedAt)}`
                : ''}
              .
            </p>
            {person.url ? (
              <a
                className="person-official"
                href={person.url}
                target="_blank"
                rel="noreferrer"
              >
                Official site <ExternalLink size={13} aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </header>

        <section className="person-coverage" aria-labelledby="coverage-title">
          <h2 id="coverage-title">What the Journal has reported</h2>
          <ol>
            {person.stories.map((story) => (
              <li key={story.slug}>
                <Link
                  href={`/article/${story.slug}`}
                  className="person-story-image photo-frame"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  <Image
                    src={story.imageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 760px) 96px, 180px"
                  />
                </Link>
                <div>
                  <p className="eyebrow">
                    {story.section} ·{' '}
                    <time dateTime={story.publishedAt}>
                      {formatArticleDate(story.publishedAt)}
                    </time>
                  </p>
                  <h3>
                    <Link href={`/article/${story.slug}`}>{story.title}</Link>
                  </h3>
                  <blockquote>
                    {story.excerpt.text.slice(0, story.excerpt.markStart)}
                    <mark>
                      {story.excerpt.text.slice(
                        story.excerpt.markStart,
                        story.excerpt.markEnd,
                      )}
                    </mark>
                    {story.excerpt.text.slice(story.excerpt.markEnd)}
                  </blockquote>
                  <small>
                    {story.mentions === 1
                      ? 'Named once'
                      : `Named ${story.mentions} times`}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {person.alongside.length ? (
          <section
            className="person-alongside"
            aria-labelledby="alongside-title"
          >
            <h2 id="alongside-title">Often named alongside</h2>
            <ul>
              {person.alongside.map(({ person: other, stories }) => (
                <li key={other.slug}>
                  <Link href={`/people/${other.slug}`}>
                    <PersonPortrait person={other} size={48} />
                    <span>
                      <strong>{other.name}</strong>
                      <small>{other.office}</small>
                      <em>
                        {stories === 1
                          ? 'In 1 story together'
                          : `In ${stories} stories together`}
                      </em>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="person-method">
          This page lists every published Journal story that names {person.name}
          , found by the same rules that put a face beside a story: a full name,
          a title that points to one person, or a surname only one person in our
          register carries. Portraits are official or openly licensed and
          credited; none is generated by AI.{' '}
          <Link href="/standards">Our standards</Link>
        </p>
      </article>
      <SiteFooter />
    </main>
  );
}
