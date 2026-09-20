import { CA_DISTRICTS, CA_DISTRICT_VIEW_BOX } from '@/lib/ca-districts';
import { getCongressionalRaces, sideOf } from '@/lib/races';
import { RaceMatchups } from '@/components/race-matchups';

/**
 * A mini California with the House matchups beside it.
 *
 * Each of the 52 real congressional districts is coloured by the party that
 * will hold it: the called winner once a race has one, and the current holder
 * until then. There is no forecast column in this data and none is invented,
 * so the map reports standing rather than prediction; when races are called it
 * switches to results and stops moving.
 */
const FILL = { D: '#2563eb', R: '#dc2626', O: '#7c3aed' } as const;

export async function CaliforniaPulseMap() {
  const races = await getCongressionalRaces();
  if (!races.length) return null;

  const byDistrict = new Map(races.map((race) => [race.district, race]));
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
    <figure className={`ca-map${settled ? ' is-settled' : ''}`} aria-label={label}>
      <svg viewBox={CA_DISTRICT_VIEW_BOX} aria-hidden="true">
        {CA_DISTRICTS.map((district) => {
          const race = byDistrict.get(district.n);
          const side = race ? sideOf(race) : null;
          const isCalled = Boolean(race?.calledAt);
          return (
            <path
              key={district.n}
              d={district.d}
              className={[
                'ca-district',
                side ? `is-${side.toLowerCase()}` : 'is-none',
                isCalled ? 'is-called' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              fill={side ? FILL[side] : '#64748b'}
            />
          );
        })}
      </svg>

      <RaceMatchups races={races} />

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
