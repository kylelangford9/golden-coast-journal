/**
 * Which feed items the newsroom drafts next, and what to do with one that
 * could not be drafted.
 *
 * Separate from lib/pipeline.ts because it touches neither the database nor
 * the network, so scripts/candidate-selection.test.mjs can exercise the rules
 * themselves.
 */

export type RankableCandidate = {
  source_id: string;
  published_at: string | null;
  discovered_at: string;
};

export type RankableSource = {
  id: string;
  trust_tier: number;
  priority: number | null;
};

const HOUR_MS = 3_600_000;

/** Hours since the source published the item, or since we found it. */
export function candidateAgeHours(candidate: RankableCandidate, now: number) {
  const at = Date.parse(candidate.published_at || candidate.discovered_at);
  return Number.isFinite(at) ? Math.max(0, (now - at) / HOUR_MS) : 48;
}

/**
 * A candidate's standing now, not when it was found: trust, plus the source's
 * priority, less every hour the item has aged.
 *
 * The score stored at discovery cannot do this job. The feeds are read every
 * hour, so nearly everything is found within the hour and stored at 99 or
 * 100, and it stays there: a nine-day-old NASA notice tied with the morning's
 * news, and a source's priority reached only items found after it was set.
 */
export function candidateScore(
  candidate: RankableCandidate,
  source: RankableSource,
  now: number,
) {
  return (
    (source.trust_tier === 1 ? 100 : 70) +
    (source.priority || 0) -
    candidateAgeHours(candidate, now)
  );
}

/**
 * The drafting order for the waiting candidates, best first, and the ones too
 * old to be news any more.
 *
 * A candidate whose source is not in `sources` (switched off, or gone) is in
 * neither list: it is never drafted, and it is left as it is in case the
 * source is switched back on. It used to hold a drafting slot every hour.
 */
export function rankCandidates<C extends RankableCandidate>(
  candidates: C[],
  sources: RankableSource[],
  now: number,
  maxAgeHours: number,
) {
  const byId = new Map(sources.map((source) => [source.id, source]));
  const scored: { candidate: C; score: number }[] = [];
  const stale: C[] = [];
  for (const candidate of candidates) {
    const source = byId.get(candidate.source_id);
    if (!source) continue;
    if (candidateAgeHours(candidate, now) > maxAgeHours) {
      stale.push(candidate);
      continue;
    }
    scored.push({ candidate, score: candidateScore(candidate, source, now) });
  }
  scored.sort((a, b) => b.score - a.score);
  return { ranked: scored.map(({ candidate }) => candidate), stale };
}

/**
 * Whether a drafting failure will recur on every later attempt: the source
 * page refused the Journal's reader, or no longer exists. NOAA's item pages
 * answer the Journal with 403, and one such item at the top of the queue
 * blocked drafting for seven hours in a row, because a failed candidate went
 * back into the queue with its score untouched. A timeout, a 5xx or a model
 * error may clear, so those are tried again.
 */
export function isPermanentFailure(message: string) {
  return /\bSource returned (401|403|404|410|451)\b/.test(message);
}
