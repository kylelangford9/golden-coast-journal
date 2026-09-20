import Image from 'next/image';
import type { CongressionalRace } from '@/lib/races';

/**
 * Real House matchups beside the map: the seat, the two candidates on the
 * ballot, and which of them holds it now. Once a race is called the winner is
 * marked and it stops changing, because the result is then a fact rather than
 * a standing.
 */
function partyClass(party: string | null) {
  if (party === 'Democrat') return 'is-d';
  if (party === 'Republican') return 'is-r';
  return 'is-o';
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter((part) => /^[A-Za-z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

export function RaceMatchups({ races }: { races: CongressionalRace[] }) {
  const shown = races.filter((race) => race.candidates.length >= 2).slice(0, 4);
  if (!shown.length) return null;

  return (
    <ul className="matchups" aria-label="California House matchups">
      {shown.map((race) => {
        const called = Boolean(race.calledAt);
        return (
          <li key={race.district} className={called ? 'is-called' : undefined}>
            <span className="matchup-seat">CA-{race.district}</span>
            <span className="matchup-pair">
              {race.candidates.slice(0, 2).map((person) => (
                <span
                  key={person.name}
                  className={`matchup-person ${partyClass(person.party)}`}
                >
                  <span className="matchup-face">
                    {person.photoUrl ? (
                      <Image src={person.photoUrl} alt="" fill sizes="28px" />
                    ) : (
                      <span aria-hidden="true">{initials(person.name)}</span>
                    )}
                  </span>
                  <span className="matchup-name">{person.name}</span>
                  {person.isIncumbent ? (
                    <span className="matchup-flag" title="Currently holds this seat">
                      holds
                    </span>
                  ) : null}
                </span>
              ))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
