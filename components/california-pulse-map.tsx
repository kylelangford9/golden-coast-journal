import { CALIFORNIA_PATH, CALIFORNIA_VIEW_BOX } from '@/lib/california-outline';
import { getSupabase, unwrap } from '@/lib/supabase-server';

/**
 * California, coloured by who actually holds its seats.
 *
 * The outline is a real Census-derived boundary, simplified for an inline path.
 * The seat counts are read live from the representatives register rather than
 * typed in, so the split moves when the register does. The pulse is carried
 * over from the red-blue district map in Democrat Domination: fill-opacity 0.5
 * to 0.8 over two seconds, on the same partisan palette.
 */
type Split = { dem: number; rep: number; other: number; total: number };

async function readSplit(): Promise<Split | null> {
  try {
    const rows =
      (unwrap(
        await getSupabase()
          .from('representatives')
          .select('party')
          .neq('is_active', false),
        'Unable to load delegation',
      ) as { party: string | null }[] | null) || [];
    if (!rows.length) return null;
    const dem = rows.filter((row) => row.party === 'Democrat').length;
    const rep = rows.filter((row) => row.party === 'Republican').length;
    return { dem, rep, other: rows.length - dem - rep, total: rows.length };
  } catch {
    // The map is decoration over real data; if the register is unreachable the
    // page simply goes without it rather than inventing a split.
    return null;
  }
}

export async function CaliforniaPulseMap() {
  const split = await readSplit();
  if (!split) return null;

  const demShare = Math.round((split.dem / split.total) * 100);
  const label = `California delegation: ${split.dem} Democrats, ${split.rep} Republicans${
    split.other ? `, ${split.other} independent` : ''
  }`;

  return (
    <figure className="ca-map" aria-label={label}>
      <svg viewBox={CALIFORNIA_VIEW_BOX} aria-hidden="true">
        <defs>
          {/* The seam sits at the real Democratic share of the delegation. */}
          <linearGradient id="ca-split" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#1e40af" />
            <stop offset={`${demShare}%`} stopColor="#2563eb" />
            <stop offset={`${demShare}%`} stopColor="#dc2626" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
        </defs>
        <path className="ca-map-glow" d={CALIFORNIA_PATH} />
        <path className="ca-map-fill" d={CALIFORNIA_PATH} fill="url(#ca-split)" />
      </svg>
      <figcaption>
        <span className="ca-map-tally">
          <b className="is-dem">{split.dem} D</b>
          <b className="is-rep">{split.rep} R</b>
          {split.other ? <b className="is-other">{split.other} I</b> : null}
        </span>
        <span className="ca-map-note">
          Current California delegation, state and federal
        </span>
      </figcaption>
    </figure>
  );
}
