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

export async function getReaderPollResults(): Promise<ReaderPollResult[]> {
  const rows = unwrap(
    await getSupabase().rpc('gcj_poll_results'),
    'Unable to load reader poll results',
  ) as PollResultRow[];

  const counts = new Map(
    rows.map((row) => [
      `${row.poll_id}:${row.option_id}`,
      Number(row.votes) || 0,
    ]),
  );

  return readerPolls.map((poll) => {
    const result = emptyReaderPollResult(poll);
    result.options = result.options.map((option) => ({
      ...option,
      votes: counts.get(`${poll.id}:${option.id}`) || 0,
    }));
    result.totalVotes = result.options.reduce(
      (sum, option) => sum + option.votes,
      0,
    );
    return result;
  });
}
