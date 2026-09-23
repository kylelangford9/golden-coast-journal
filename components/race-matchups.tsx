'use client';

import Image from 'next/image';
import {
  type FocusEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { CA_DISTRICTS } from '@/lib/ca-districts';
import type { CongressionalRace, PartySide } from '@/lib/races';
import { DistrictMap, type Seat } from './district-map';
import styles from './race-matchups.module.css';

const DWELL_MS = 5_000;
const FADE_MS = 320;
const COUNT = CA_DISTRICTS.length;

/** A race with the side its district is coloured, worked out on the server. */
export type MatchupRace = CongressionalRace & { side: PartySide | null };

type Person = CongressionalRace['candidates'][number];

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

/**
 * The two people to set either side of the map: the Democrat on the left and
 * the Republican on the right. A top-two contest can send two candidates of
 * one party to November, so a missing side takes the next candidate instead.
 */
function pairOf(race: CongressionalRace | undefined) {
  if (!race) return { left: undefined, right: undefined };
  const democrat = race.candidates.find((c) => c.party === 'Democrat');
  const republican = race.candidates.find((c) => c.party === 'Republican');
  const rest = race.candidates.filter((c) => c !== democrat && c !== republican);
  return { left: democrat ?? rest.shift(), right: republican ?? rest.shift() };
}

function hasBothSides(race: CongressionalRace) {
  return (
    race.candidates.some((c) => c.party === 'Democrat') &&
    race.candidates.some((c) => c.party === 'Republican')
  );
}

function adjective(party: string) {
  if (party === 'Democrat') return 'Democratic';
  return party;
}

/** What a screen reader hears for a district, e.g. "District 22, Republican seat: …". */
function describe(district: number, race: MatchupRace | undefined) {
  if (!race) return `District ${district}: no race information yet`;
  const { left, right } = pairOf(race);
  const people = [left, right]
    .filter((person): person is Person => Boolean(person))
    .map(
      (person) =>
        `${person.name}, ${person.party || 'no party listed'}${person.isIncumbent ? ', incumbent' : ''}`,
    );
  const standing =
    race.calledAt && race.winnerParty
      ? `called for the ${race.winnerParty}`
      : race.incumbentParty
        ? `${adjective(race.incumbentParty)} seat`
        : null;
  return `District ${district}${standing ? `, ${standing}` : ''}: ${
    people.length ? people.join(' vs. ') : 'no candidates listed'
  }`;
}

function Side({ person, faded }: { person: Person | undefined; faded: boolean }) {
  const tone =
    person?.party === 'Democrat'
      ? styles.isD
      : person?.party === 'Republican'
        ? styles.isR
        : styles.isO;
  return (
    <div className={`${styles.column} ${tone}`}>
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
 * The races take turns on their own, and the district of whichever race is on
 * show lights up on the map. A reader can pick a district instead, by tapping
 * or clicking it, with the arrow keys, or with the arrows beside the seat
 * label; from then on the map stays where the reader put it. Pointing at or
 * focusing the map pauses the turns while the reader looks.
 *
 * The columns sit in space the map was not using, so nothing below moves; the
 * card keeps its height while the contests fade from one to the next.
 */
export function RaceMatchups({ races }: { races: MatchupRace[] }) {
  const byDistrict = useMemo(() => new Map(races.map((race) => [race.district, race])), [races]);
  // The turns only visit contests that have a candidate on each side.
  const rotation = useMemo(() => races.filter(hasBothSides).map((race) => race.district), [races]);
  const seats = useMemo(
    () =>
      new Map<number, Seat>(
        CA_DISTRICTS.map(({ n }) => {
          const race = byDistrict.get(n);
          return [n, { side: race?.side ?? null, label: describe(n, race) }];
        }),
      ),
    [byDistrict],
  );

  const [shown, setShown] = useState<number | null>(rotation[0] ?? null);
  const [faded, setFaded] = useState(false);
  const [held, setHeld] = useState(false);
  const [pointerInside, setPointerInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const fadeTimer = useRef<number | undefined>(undefined);

  const paused = held || pointerInside || focusInside;

  useEffect(() => {
    if (paused || rotation.length < 2) return;
    const timer = window.setInterval(() => {
      setFaded(true);
      fadeTimer.current = window.setTimeout(() => {
        setShown((current) => rotation.find((district) => district > (current ?? 0)) ?? rotation[0]);
        setFaded(false);
      }, FADE_MS);
    }, DWELL_MS);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(fadeTimer.current);
      setFaded(false);
    };
  }, [paused, rotation]);

  const pick = useCallback(
    (district: number, announce = false) => {
      window.clearTimeout(fadeTimer.current);
      setFaded(false);
      setHeld(true);
      setShown(district);
      // The map's own radio buttons are read out as they take focus; the
      // arrow buttons keep focus on themselves, so say where they went.
      setAnnouncement(announce ? describe(district, byDistrict.get(district)) : '');
    },
    [byDistrict],
  );

  const race = shown == null ? undefined : byDistrict.get(shown);
  const { left, right } = pairOf(race);
  const current = shown ?? 1;
  const previous = ((current + COUNT - 2) % COUNT) + 1;
  const next = (current % COUNT) + 1;

  return (
    <div
      className="ca-map-stage"
      onPointerEnter={(event: PointerEvent) => {
        if (event.pointerType === 'mouse') setPointerInside(true);
      }}
      onPointerLeave={() => setPointerInside(false)}
      onFocus={() => setFocusInside(true)}
      onBlur={(event: FocusEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusInside(false);
      }}
    >
      <Side person={left} faded={faded} />
      <div className={styles.middle}>
        <DistrictMap lit={shown} seats={seats} onPick={pick} />
        <div className={styles.seat}>
          <button
            type="button"
            className={styles.step}
            aria-label={`Show district ${previous}`}
            onClick={() => pick(previous, true)}
          >
            ‹
          </button>
          <span className={`${styles.seatLabel}${faded ? ' ' + styles.isFaded : ''}`}>
            {shown == null ? 'CA' : `CA-${shown}`}
            {race?.calledAt ? <i className={styles.called}>called</i> : null}
          </span>
          <button
            type="button"
            className={styles.step}
            aria-label={`Show district ${next}`}
            onClick={() => pick(next, true)}
          >
            ›
          </button>
        </div>
        <output className={styles.srOnly}>{announcement}</output>
      </div>
      <Side person={right} faded={faded} />
    </div>
  );
}
