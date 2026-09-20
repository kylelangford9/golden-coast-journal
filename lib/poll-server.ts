import 'server-only';
import {
  emptyReaderPollResult,
  readerPolls,
  type ReaderPollResult,
} from '@/lib/polls';
import { getSupabase, unwrap } from '@/lib/supabase-server';

type PollResultRow = {
  poll_id: string;
  option_id: string;
  votes: number | string;
};

type PollAssetRow = { id: string; url: string; alt: string; credit: string };

/**
 * The photographs the poll options name, read from the approved asset table.
 *
 * An option carries an id, not a URL, so a picture cannot go stale in the
 * source: if a row is missing or switched off the option simply renders
 * without a photograph instead of serving a broken image.
 */
async function getPollAssets(): Promise<Map<string, PollAssetRow>> {
  const ids = [
    ...new Set(
      readerPolls.flatMap((poll) => [
        poll.heroAssetId,
        ...poll.options.map((option) => option.assetId),
      ]),
    ),
  ].filter(Boolean) as string[];
  if (!ids.length) return new Map();

  const rows = unwrap(
    await getSupabase()
      .from('gcj_editorial_assets')
      .select('id, url, alt, credit')
      .in('id', ids)
      .eq('active', true),
    'Unable to load reader poll imagery',
  ) as PollAssetRow[];

  return new Map(rows.map((row) => [row.id, row]));
}

export async function getReaderPollResults(): Promise<ReaderPollResult[]> {
  const [rows, assets] = await Promise.all([
    Promise.resolve(
      unwrap(
        await getSupabase().rpc('gcj_poll_results'),
        'Unable to load reader poll results',
      ) as PollResultRow[],
    ),
    getPollAssets(),
  ]);

  const counts = new Map(
    rows.map((row) => [
      `${row.poll_id}:${row.option_id}`,
      Number(row.votes) || 0,
    ]),
  );

  return readerPolls.map((poll) => {
    const result = emptyReaderPollResult(poll);
    result.options = result.options.map((option) => {
      const asset = option.assetId ? assets.get(option.assetId) : undefined;
      return {
        ...option,
        image: asset?.url,
        imageAlt: asset?.alt,
        votes: counts.get(`${poll.id}:${option.id}`) || 0,
      };
    });
    const hero = poll.heroAssetId ? assets.get(poll.heroAssetId) : undefined;
    result.hero = hero
      ? { url: hero.url, alt: hero.alt, credit: hero.credit }
      : undefined;
    result.totalVotes = result.options.reduce(
      (sum, option) => sum + option.votes,
      0,
    );
    return result;
  });
}
