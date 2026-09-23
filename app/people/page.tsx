import type { Metadata } from 'next';
import { connection } from 'next/server';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { LEVEL_LABELS, levelLabel } from '@/components/person-card';
import {
  PeopleDirectory,
  type DirectoryPerson,
} from '@/components/people-directory';
import { peopleCoverage } from '@/lib/people';

export const metadata: Metadata = {
  title: 'People in the Journal',
  description:
    'Everyone The Golden Coast Journal has named in its reporting, with every story that names them.',
  alternates: { canonical: '/people' },
};

export default async function PeoplePage() {
  // Coverage grows with every published story, so this is read per request.
  await connection();
  const coverage = [...(await peopleCoverage()).values()];
  const people: DirectoryPerson[] = coverage.map((person) => ({
    slug: person.slug,
    name: person.name,
    office: person.office,
    party: person.party,
    group: levelLabel(person.level),
    photoUrl: person.photoUrl,
    stories: person.stories.length,
    latestAt: person.stories[0].publishedAt,
    latestTitle: person.stories[0].title,
  }));
  const groups = Object.values(LEVEL_LABELS).filter((label) =>
    people.some((person) => person.group === label),
  );
  const storyCount = new Set(
    coverage.flatMap((person) => person.stories.map((story) => story.slug)),
  ).size;

  return (
    <main>
      <SiteHeader />
      <article className="institutional shell people-page">
        <p className="eyebrow">People in the Journal</p>
        <h1>Who the Journal is covering.</h1>
        <p className="standfirst">
          {people.length} people named across {storyCount} published stories,
          from the governor and the Legislature to agency heads, mayors, judges
          and world leaders. Each page gathers everything we have reported about
          them, with the sentence where they appear.
        </p>
        <PeopleDirectory people={people} groups={groups} />
      </article>
      <SiteFooter />
    </main>
  );
}
