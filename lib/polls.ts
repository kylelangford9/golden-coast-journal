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
  {
    id: 'proposition-explainer-priority-2026',
    question: 'Which part of the 2026 ballot needs a deeper explainer first?',
    context:
      'Choose the policy area where a sourced Journal follow-up would be most useful.',
    options: [
      { id: 'housing-and-bonds', label: 'Housing and bonds' },
      { id: 'taxes-and-budget', label: 'Taxes and budget' },
      { id: 'elections-and-government', label: 'Elections and government' },
      { id: 'health-and-environment', label: 'Health and environment' },
    ],
  },
  {
    id: 'candidate-office-explainer-priority-2026',
    question: 'Which statewide office needs the clearest explainer next?',
    context:
      'Choose the office where a sourced Journal follow-up would be most useful.',
    options: [
      { id: 'governor-and-lieutenant', label: 'Governor and lieutenant' },
      { id: 'money-and-taxes', label: 'Money and tax offices' },
      { id: 'justice-and-insurance', label: 'Justice and insurance' },
      { id: 'education-and-elections', label: 'Education and elections' },
    ],
  },
  {
    id: 'election-help-priority-2026',
    question: 'What do you still need before you can finish your ballot?',
    context:
      'Choose the part where one more sourced guide would save the most time.',
    options: [
      { id: 'candidate-comparisons', label: 'Candidate comparisons' },
      { id: 'proposition-details', label: 'Proposition details' },
      { id: 'local-ballot', label: 'My local ballot' },
      { id: 'voting-logistics', label: 'Voting logistics' },
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
