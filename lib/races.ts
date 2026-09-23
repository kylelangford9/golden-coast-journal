import { getSupabase, unwrap } from '@/lib/supabase-server';

/**
 * California congressional races, read from the California Votes tables that
 * this project already shares.
 *
 * Colour follows the called winner once a race has one, and the current
 * holder's party before that. There is no forecast or rating column in this
 * data, so nothing here projects a result; when `calledAt` is set the race is
 * settled and stops moving.
 */
export type RaceCandidate = {
  name: string;
  party: string | null;
  photoUrl: string | null;
  isIncumbent: boolean;
};

export type CongressionalRace = {
  district: number;
  incumbentParty: string | null;
  winnerParty: string | null;
  calledAt: string | null;
  candidates: RaceCandidate[];
};

type Row = {
  district_number: number | null;
  winner_candidate_id: string | null;
  called_at: string | null;
  race_candidates: {
    candidates: {
      id: string;
      name: string;
      party: string | null;
      photo_url: string | null;
      is_incumbent: boolean | null;
    } | null;
  }[];
};

const CACHE_MS = 5 * 60_000;
let cached: { races: CongressionalRace[]; loadedAt: number } | null = null;

export async function getCongressionalRaces(): Promise<CongressionalRace[]> {
  if (cached && Date.now() - cached.loadedAt < CACHE_MS) return cached.races;

  let rows: Row[] = [];
  try {
    rows =
      (unwrap(
        await getSupabase()
          .from('races')
          .select(
            'district_number,winner_candidate_id,called_at,race_candidates(candidates(id,name,party,photo_url,is_incumbent))',
          )
          .eq('district_type', 'Congressional'),
        'Unable to load races',
      ) as Row[] | null) || [];
  } catch {
    return [];
  }

  const races = rows
    .filter((row) => row.district_number != null)
    .map((row) => {
      const people = row.race_candidates
        .map((entry) => entry.candidates)
        .filter((c): c is NonNullable<typeof c> => Boolean(c));
      const winner = row.winner_candidate_id
        ? people.find((person) => person.id === row.winner_candidate_id)
        : undefined;
      return {
        district: row.district_number as number,
        incumbentParty: people.find((p) => p.is_incumbent)?.party || null,
        winnerParty: winner?.party || null,
        calledAt: row.called_at,
        candidates: people
          .map((person) => ({
            name: person.name,
            party: person.party,
            photoUrl: person.photo_url,
            isIncumbent: Boolean(person.is_incumbent),
          }))
          // Incumbent first, so a matchup reads holder against challenger.
          .sort((a, b) => Number(b.isIncumbent) - Number(a.isIncumbent)),
      };
    })
    .sort((a, b) => a.district - b.district);

  cached = { races, loadedAt: Date.now() };
  return races;
}

export type PartySide = 'D' | 'R' | 'O';

/** The side a district is shown as: the winner once called, else the holder. */
export function sideOf(race: CongressionalRace): PartySide | null {
  const party = race.winnerParty || race.incumbentParty;
  if (!party) return null;
  if (party === 'Democrat') return 'D';
  if (party === 'Republican') return 'R';
  return 'O';
}
