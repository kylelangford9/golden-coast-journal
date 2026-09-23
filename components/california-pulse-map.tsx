import { getCongressionalRaces, sideOf } from '@/lib/races';
import { RaceMatchups } from '@/components/race-matchups';

/**
 * A mini California with the House matchups beside it.
 *
 * The 52 districts are the ones Proposition 50 set for 2026 (AB 604; see
 * lib/ca-districts.ts). Each is coloured by the party that will hold it: the
 * called winner once a race has one, and the current holder until then. There
 * is no forecast column in this data and none is invented, so the map reports
 * standing rather than prediction.
 *
 * This part stays on the server: it loads the races and writes the tally. The
 * map and the matchups beside it are the small client component, because a
 * reader can pick a district and the race on show lights its district up.
 */
export async function CaliforniaPulseMap() {
  const races = await getCongressionalRaces();
  if (!races.length) return null;

  const called = races.filter((race) => race.calledAt).length;
  const settled = called === races.length && races.length > 0;

  let dem = 0;
  let rep = 0;
  for (const race of races) {
    const side = sideOf(race);
    if (side === 'D') dem += 1;
    if (side === 'R') rep += 1;
  }

  const label = settled
    ? `California House result: ${dem} Democratic seats, ${rep} Republican`
    : `California House seats as they stand: ${dem} Democratic, ${rep} Republican`;

  return (
    <figure className="ca-map" aria-label={label}>
      <RaceMatchups races={races.map((race) => ({ ...race, side: sideOf(race) }))} />

      <figcaption>
        <span className="ca-map-tally">
          <b className="is-dem">{dem} D</b>
          <b className="is-rep">{rep} R</b>
        </span>
        <span className="ca-map-note">
          {settled
            ? 'California House results'
            : `${races.length} House seats; ${called} called`}
        </span>
      </figcaption>
    </figure>
  );
}
