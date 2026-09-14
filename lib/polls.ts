export type ReaderPollOption = {
  id: string;
  label: string;
};

export type ReaderPollDefinition = {
  id: string;
  question: string;
  context: string;
  options: ReaderPollOption[];
};

export type ReaderPollOptionResult = ReaderPollOption & {
  votes: number;
};

export type ReaderPollResult = Omit<ReaderPollDefinition, 'options'> & {
  totalVotes: number;
  options: ReaderPollOptionResult[];
};

export const readerPolls: ReaderPollDefinition[] = [
  {
    id: 'coverage-priority-2026-09',
    question: 'What should the Journal explain next?',
    context: 'Help the newsroom choose the next useful California explainer.',
    options: [
      { id: 'cost-of-living', label: 'Cost of living' },
      { id: 'wildfire-readiness', label: 'Wildfire readiness' },
      { id: 'state-government', label: 'State government' },
      { id: 'technology-and-jobs', label: 'Technology and jobs' },
    ],
  },
  {
    id: 'briefing-format-2026-09',
    question: 'Which Journal update would you actually open?',
    context: 'Tell us which rhythm would earn a place in your day.',
    options: [
      { id: 'five-minute-morning', label: 'Five-minute morning briefing' },
      { id: 'major-developments', label: 'Major developments only' },
      { id: 'sunday-edition', label: 'Sunday edition' },
      { id: 'deep-explainers', label: 'Deep explainers when needed' },
    ],
  },
];

export function findReaderPoll(pollId: string) {
  return readerPolls.find((poll) => poll.id === pollId);
}

export function emptyReaderPollResult(
  poll: ReaderPollDefinition,
): ReaderPollResult {
  return {
    ...poll,
    totalVotes: 0,
    options: poll.options.map((option) => ({ ...option, votes: 0 })),
  };
}
