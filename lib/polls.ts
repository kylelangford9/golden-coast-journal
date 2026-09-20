export type ReaderPollOption = {
  id: string;
  label: string;
  /**
   * The approved photograph this option shows, named rather than linked.
   * It is an id in `gcj_editorial_assets`; the URL, the alt text and the
   * credit all come from that row at render time. Pasting URLs here meant a
   * picture could be renamed or never uploaded and nothing would notice: the
   * wildfire option pointed at a file that was never in the bucket and served
   * a broken image on the live desk for as long as the poll had been up.
   */
  assetId?: string;
  /** Filled in from the asset row by the server; never authored here. */
  image?: string;
  imageAlt?: string;
};

export type ReaderPollDefinition = {
  id: string;
  question: string;
  context: string;
  /** The photograph above the question, named the same way the options are. */
  heroAssetId?: string;
  options: ReaderPollOption[];
};

export type ReaderPollOptionResult = ReaderPollOption & {
  votes: number;
};

export type ReaderPollAsset = { url: string; alt: string; credit: string };

export type ReaderPollResult = Omit<ReaderPollDefinition, 'options'> & {
  totalVotes: number;
  hero?: ReaderPollAsset;
  options: ReaderPollOptionResult[];
};

export const readerPolls: ReaderPollDefinition[] = [
  {
    id: 'voter-guide-help-priority-2026',
    heroAssetId: 'ca-state-capitol',
    question: 'What should the Journal help you find in the 2026 voter guides?',
    context:
      'Choose the part where one more sourced shortcut would save you the most time.',
    options: [
      { id: 'statewide-propositions', label: 'Statewide propositions', assetId: 'ca-state-capitol' },
      { id: 'statewide-candidates', label: 'Statewide candidates', assetId: 'us-capitol' },
      { id: 'local-races-and-measures', label: 'Local races and measures', assetId: 'la-city-hall' },
      { id: 'voting-rules-and-dates', label: 'Voting rules and dates', assetId: 'ca-state-library' },
    ],
  },
  {
    id: 'coverage-priority-2026-09',
    heroAssetId: 'lake-oroville',
    question: 'What should the Journal explain next?',
    context: 'Help the newsroom choose the next useful California explainer.',
    options: [
      { id: 'cost-of-living', label: 'Cost of living', assetId: 'sd-skyline' },
      { id: 'wildfire-readiness', label: 'Wildfire readiness', assetId: 'lake-oroville' },
      { id: 'state-government', label: 'State government', assetId: 'ca-state-capitol' },
      { id: 'technology-and-jobs', label: 'Technology and jobs', assetId: 'nasa-astronaut-training' },
    ],
  },
  {
    id: 'briefing-format-2026-09',
    heroAssetId: 'golden-gate-bridge',
    question: 'Which Journal update would you actually open?',
    context: 'Tell us which rhythm would earn a place in your day.',
    options: [
      { id: 'five-minute-morning', label: 'Five-minute morning briefing', assetId: 'golden-gate-bridge' },
      { id: 'major-developments', label: 'Major developments only', assetId: 'ca-state-capitol' },
      { id: 'sunday-edition', label: 'Sunday edition', assetId: 'ca-coast' },
      { id: 'deep-explainers', label: 'Deep explainers when needed', assetId: 'ca-state-library' },
    ],
  },
  {
    id: 'proposition-explainer-priority-2026',
    heroAssetId: 'ca-state-capitol',
    question: 'Which part of the 2026 ballot needs a deeper explainer first?',
    context:
      'Choose the policy area where a sourced Journal follow-up would be most useful.',
    options: [
      { id: 'housing-and-bonds', label: 'Housing and bonds', assetId: 'worker-construction' },
      { id: 'taxes-and-budget', label: 'Taxes and budget', assetId: 'ca-state-capitol' },
      { id: 'elections-and-government', label: 'Elections and government', assetId: 'ca-state-library' },
      { id: 'health-and-environment', label: 'Health and environment', assetId: 'ca-aqueduct' },
    ],
  },
  {
    id: 'candidate-office-explainer-priority-2026',
    heroAssetId: 'us-capitol',
    question: 'Which statewide office needs the clearest explainer next?',
    context:
      'Choose the office where a sourced Journal follow-up would be most useful.',
    options: [
      { id: 'governor-and-lieutenant', label: 'Governor and lieutenant', assetId: 'ca-state-capitol' },
      { id: 'money-and-taxes', label: 'Money and tax offices', assetId: 'federal-reserve' },
      { id: 'justice-and-insurance', label: 'Justice and insurance', assetId: 'doj-building' },
      { id: 'education-and-elections', label: 'Education and elections', assetId: 'ca-state-library' },
    ],
  },
  {
    id: 'election-help-priority-2026',
    heroAssetId: 'ca-coast',
    question: 'What do you still need before you can finish your ballot?',
    context:
      'Choose the part where one more sourced guide would save the most time.',
    options: [
      { id: 'candidate-comparisons', label: 'Candidate comparisons', assetId: 'us-capitol' },
      { id: 'proposition-details', label: 'Proposition details', assetId: 'ca-state-capitol' },
      { id: 'local-ballot', label: 'My local ballot', assetId: 'la-city-hall' },
      { id: 'voting-logistics', label: 'Voting logistics', assetId: 'sd-skyline' },
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
