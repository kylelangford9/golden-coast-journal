'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { track } from '@vercel/analytics/react';

export type DirectoryPerson = {
  slug: string;
  name: string;
  office: string;
  party: string | null;
  group: string;
  photoUrl: string | null;
  stories: number;
  latestAt: string;
  latestTitle: string;
};

type Sort = 'covered' | 'recent';

const initialsOf = (name: string) => {
  const words = name.split(/\s+/).filter((word) => /^\p{Lu}/u.test(word));
  return `${words[0]?.[0] || ''}${words.length > 1 ? words[words.length - 1][0] : ''}`;
};

const plain = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/**
 * Everyone the Journal has named, as a directory a reader can search and
 * narrow. Filtering happens in the browser over a list the server already
 * built, so nothing a reader types leaves the page.
 */
export function PeopleDirectory({
  people,
  groups,
}: {
  people: DirectoryPerson[];
  groups: string[];
}) {
  const [group, setGroup] = useState('All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('covered');

  const shown = useMemo(() => {
    const needle = plain(query.trim());
    const list = people.filter(
      (person) =>
        (group === 'All' || person.group === group) &&
        (!needle || plain(`${person.name} ${person.office}`).includes(needle)),
    );
    return [...list].sort((a, b) =>
      sort === 'covered'
        ? b.stories - a.stories ||
          Date.parse(b.latestAt) - Date.parse(a.latestAt)
        : Date.parse(b.latestAt) - Date.parse(a.latestAt) ||
          b.stories - a.stories,
    );
  }, [people, group, query, sort]);

  function choose(next: string) {
    setGroup(next);
    track('People Directory Filtered', { group: next });
  }

  return (
    <div className="people-directory">
      <div className="people-controls">
        <fieldset className="people-groups">
          <legend className="visually-hidden">Filter people</legend>
          {['All', ...groups].map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={group === item}
              onClick={() => choose(item)}
            >
              {item}
            </button>
          ))}
        </fieldset>
        <div className="people-search">
          <label htmlFor="people-query">Find a person</label>
          <input
            id="people-query"
            type="search"
            value={query}
            placeholder="Name or office"
            onChange={(event) => setQuery(event.target.value)}
          />
          <label htmlFor="people-sort">Order</label>
          <select
            id="people-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value as Sort)}
          >
            <option value="covered">Most covered</option>
            <option value="recent">Most recent</option>
          </select>
        </div>
      </div>
      <p className="people-count" aria-live="polite">
        {shown.length === 1 ? '1 person' : `${shown.length} people`}
      </p>
      {shown.length ? (
        <ul className="people-grid">
          {shown.map((person) => (
            <li key={person.slug}>
              <Link href={`/people/${person.slug}`}>
                <span className="person-portrait photo-frame">
                  {person.photoUrl ? (
                    <Image src={person.photoUrl} alt="" fill sizes="72px" />
                  ) : (
                    <span className="person-monogram" aria-hidden="true">
                      {initialsOf(person.name)}
                    </span>
                  )}
                </span>
                <span className="people-grid-copy">
                  <strong>{person.name}</strong>
                  <small>
                    {person.office}
                    {person.party ? ` · ${person.party}` : ''}
                  </small>
                  <em>
                    {person.stories === 1
                      ? '1 story'
                      : `${person.stories} stories`}
                    {' · latest: '}
                    {person.latestTitle}
                  </em>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="people-empty">
          Nobody the Journal has covered matches that. Try a surname or an
          office.
        </p>
      )}
    </div>
  );
}
