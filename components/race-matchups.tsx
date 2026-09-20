'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import type { CongressionalRace } from '@/lib/races';
import styles from './race-matchups.module.css';

const DWELL_MS = 5_000;

function surname(name: string) {
  const parts = name.trim().split(/\s+/).filter((p) => /^[A-Za-z]/.test(p));
  return parts[parts.length - 1] || name;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((p) => /^[A-Za-z]/.test(p))
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

type Person = CongressionalRace['candidates'][number];

function Side({
  person,
  side,
  faded,
}: {
  person: Person | undefined;
  side: 'd' | 'r';
  faded: boolean;
}) {
  return (
    <div className={`${styles.column} ${side === 'd' ? styles.isD : styles.isR}`}>
      <div className={`${styles.slot}${faded ? ' ' + styles.isFaded : ''}`}>
        {person ? (
          <>
            <span className={styles.face}>
              {person.photoUrl ? (
                <Image src={person.photoUrl} alt="" fill sizes="44px" />
              ) : (
                <span aria-hidden="true">{initials(person.name)}</span>
              )}
            </span>
            <span className={styles.name}>{surname(person.name)}</span>
            {person.isIncumbent ? <span className={styles.flag}>holds</span> : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

/**
 * One race at a time, its two candidates flanking the map: the Democrat to the
 * left of California and the Republican to the right, which is the way a
 * reader already expects to see the two sides laid out.
 *
 * The columns sit in space the map was not using, so nothing below moves; the
 * card keeps its height while the contests fade from one to the next.
 */
export function RaceMatchups({
  races,
  children,
}: {
  races: CongressionalRace[];
  /** The map, placed between the two candidates. */
  children: React.ReactNode;
}) {
  // Only contests that actually have a candidate on each side.
  const usable = races.filter(
    (race) =>
      race.candidates.some((c) => c.party === 'Democrat') &&
      race.candidates.some((c) => c.party === 'Republican'),
  );
  const [index, setIndex] = useState(0);
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    if (usable.length < 2) return;
    const timer = window.setInterval(() => {
      setFaded(true);
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % usable.length);
        setFaded(false);
      }, 320);
    }, DWELL_MS);
    return () => window.clearInterval(timer);
  }, [usable.length]);

  if (!usable.length) return <>{children}</>;

  const race = usable[index % usable.length];
  const democrat = race.candidates.find((c) => c.party === 'Democrat');
  const republican = race.candidates.find((c) => c.party === 'Republican');

  return (
    <>
      <Side person={democrat} side="d" faded={faded} />
      <div className={styles.middle}>
        {children}
        <span className={`${styles.seat}${faded ? ' ' + styles.isFaded : ''}`}>
          CA-{race.district}
          {race.calledAt ? <i className={styles.called}>called</i> : null}
        </span>
      </div>
      <Side person={republican} side="r" faded={faded} />
    </>
  );
}
