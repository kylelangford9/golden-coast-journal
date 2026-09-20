'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

import type { CongressionalRace } from '@/lib/races';
import styles from './race-matchups.module.css';

const DWELL_MS = 5_000;

function partyClass(party: string | null) {
  if (party === 'Democrat') return styles.isD;
  if (party === 'Republican') return styles.isR;
  return styles.isO;
}

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

function Slot({ race, faded }: { race: CongressionalRace; faded: boolean }) {
  return (
    <div className={`${styles.slot}${faded ? ' ' + styles.isFaded : ''}`}>
      <span className={styles.seat}>
        CA-{race.district}
        {race.calledAt ? <i className={styles.called}>called</i> : null}
      </span>
      {race.candidates.slice(0, 2).map((person) => (
        <span key={person.name} className={`${styles.person} ${partyClass(person.party)}`}>
          <span className={styles.face}>
            {person.photoUrl ? (
              <Image src={person.photoUrl} alt="" fill sizes="26px" />
            ) : (
              <span aria-hidden="true">{initials(person.name)}</span>
            )}
          </span>
          <span className={styles.name}>{surname(person.name)}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * Races either side of the map, fading one out and the next in.
 *
 * The columns sit in space the map was not using, so nothing below moves; the
 * card keeps its height while the seats cycle through. Two at a time, left and
 * right, so a reader sees a pair of contests rather than a list.
 */
export function RaceMatchups({ races }: { races: CongressionalRace[] }) {
  const usable = races.filter((race) => race.candidates.length >= 2);
  const [index, setIndex] = useState(0);
  const [faded, setFaded] = useState(false);

  useEffect(() => {
    if (usable.length < 3) return;
    const timer = window.setInterval(() => {
      setFaded(true);
      window.setTimeout(() => {
        setIndex((current) => (current + 2) % usable.length);
        setFaded(false);
      }, 320);
    }, DWELL_MS);
    return () => window.clearInterval(timer);
  }, [usable.length]);

  if (usable.length < 2) return null;
  const left = usable[index % usable.length];
  const right = usable[(index + 1) % usable.length];

  return (
    <>
      <div className={styles.column} aria-hidden="true">
        <Slot race={left} faded={faded} />
      </div>
      <div className={styles.column} aria-hidden="true">
        <Slot race={right} faded={faded} />
      </div>
    </>
  );
}
