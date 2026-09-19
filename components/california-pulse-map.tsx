import { CA_DISTRICTS, CA_DISTRICT_VIEW_BOX } from '@/lib/ca-districts';
import { getSupabase, unwrap } from '@/lib/supabase-server';

/**
 * A mini California, coloured district by district.
 *
 * The shapes are the 52 real congressional districts from the California
 * Voters boundary set, and the colour of each is the party that actually holds
 * it, read live from the representatives register. The pulse and the palette
 * are carried over from the red-blue district map in Democrat Domination.
 */
type Held = Record<number, 'D' | 'R' | 'O'>;

async function readDistricts(): Promise<{ held: Held; dem: number; rep: number } | null> {
  try {
    const rows =
      (unwrap(
        await getSupabase()
          .from('representatives')
          .select('party,district_number')
          .eq('district_type', 'Congressional')
          .neq('is_active', false),
        'Unable to load districts',
      ) as { party: string | null; district_number: number | null }[] | null) || [];
    if (!rows.length) return null;

    const held: Held = {};
    let dem = 0;
    let rep = 0;
    for (const row of rows) {
      if (row.district_number == null) continue;
      const side = row.party === 'Democrat' ? 'D' : row.party === 'Republican' ? 'R' : 'O';
      held[row.district_number] = side;
      if (side === 'D') dem += 1;
      if (side === 'R') rep += 1;
    }
    return { held, dem, rep };
  } catch {
    return null;
  }
}

const FILL = { D: '#2563eb', R: '#dc2626', O: '#7c3aed' } as const;

export async function CaliforniaPulseMap() {
  const data = await readDistricts();
  if (!data) return null;

  const label = `California congressional delegation: ${data.dem} Democratic districts, ${data.rep} Republican`;

  return (
    <figure className="ca-map" aria-label={label}>
      <svg viewBox={CA_DISTRICT_VIEW_BOX} aria-hidden="true">
        {CA_DISTRICTS.map((district) => {
          const side = data.held[district.n];
          return (
            <path
              key={district.n}
              d={district.d}
              className={side ? `ca-district is-${side.toLowerCase()}` : 'ca-district is-none'}
              fill={side ? FILL[side] : '#64748b'}
            />
          );
        })}
      </svg>
      <figcaption>
        <span className="ca-map-tally">
          <b className="is-dem">{data.dem} D</b>
          <b className="is-rep">{data.rep} R</b>
        </span>
        <span className="ca-map-note">California congressional districts</span>
      </figcaption>
    </figure>
  );
}
