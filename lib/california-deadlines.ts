export type DeadlineCategory = 'Elections' | 'Taxes' | 'Workplace';

export type CaliforniaDeadline = {
  id: string;
  date: string;
  endDate?: string;
  category: DeadlineCategory;
  kind: 'Deadline' | 'Start date' | 'Recommended date' | 'Change';
  title: string;
  summary: string;
  action: string;
  sources: Array<{ name: string; url: string }>;
  journalHref?: string;
};

const electionDatesSource = {
  name: 'California Secretary of State: Key Dates and Deadlines',
  url: 'https://www.sos.ca.gov/elections/upcoming-elections/general-election-november-3-2026/key-dates-deadlines',
};

const electionOverviewSource = {
  name: 'California Secretary of State: General Election',
  url: 'https://www.sos.ca.gov/elections/upcoming-elections/general-election-november-3-2026',
};

export const californiaDeadlines: CaliforniaDeadline[] = [
  {
    id: 'federal-estimated-tax-september-2026',
    date: '2026-09-15',
    category: 'Taxes',
    kind: 'Deadline',
    title: 'Federal estimated-tax installment',
    summary:
      'September 15 is the general federal estimated-tax due date for income received from June 1 through August 31. California also lists a third installment date, but its standard schedule assigns 0% to that installment; annualized-income situations can differ.',
    action:
      'Check the federal amount due and the California 540-ES worksheet that applies to your income pattern.',
    sources: [
      {
        name: 'IRS: Publication 505 for 2026',
        url: 'https://www.irs.gov/publications/p505',
      },
      {
        name: 'California FTB: Estimated tax payments',
        url: 'https://www.ftb.ca.gov/pay/estimated-tax-payments.html',
      },
    ],
  },
  {
    id: 'voter-guides-mailing-2026',
    date: '2026-09-24',
    endDate: '2026-10-13',
    category: 'Elections',
    kind: 'Start date',
    title: 'State and county voter guides begin mailing',
    summary:
      'The state and county voter-information-guide mailing period runs from September 24 through October 13.',
    action:
      'Review the online state guide now; contact the county elections office if expected local material does not arrive.',
    sources: [electionDatesSource],
    journalHref: '/article/california-2026-general-election-deadlines',
  },
  {
    id: 'ballots-mail-early-voting-2026',
    date: '2026-10-05',
    category: 'Elections',
    kind: 'Start date',
    title: 'Ballots begin mailing; early voting begins',
    summary:
      'County officials must begin mailing vote-by-mail ballots to active registered voters no later than October 5. Early voting also begins.',
    action:
      'Verify the mailing address in My Voter Status and check the official early-voting locator for local hours.',
    sources: [electionDatesSource, electionOverviewSource],
    journalHref: '/article/california-2026-general-election-deadlines',
  },
  {
    id: 'ballot-drop-off-opens-2026',
    date: '2026-10-06',
    endDate: '2026-11-03',
    category: 'Elections',
    kind: 'Start date',
    title: 'Ballot drop-off locations open statewide',
    summary:
      'All counties must open vote-by-mail ballot drop-off locations by October 6; the locations remain available through Election Day.',
    action:
      'Use the official early-voting locator or county elections office to confirm a current location and schedule.',
    sources: [electionDatesSource],
    journalHref: '/article/california-2026-general-election-deadlines',
  },
  {
    id: 'tax-extension-filing-2026',
    date: '2026-10-15',
    category: 'Taxes',
    kind: 'Deadline',
    title: '2025 individual income-tax returns on extension',
    summary:
      'October 15 is the ordinary filing deadline for California individual returns under the state’s automatic extension and for federal individual returns with a timely extension. The ordinary payment deadline remained April 15.',
    action:
      'File the applicable return, retain acceptance records and confirm whether a disaster, military or overseas rule changes the date.',
    sources: [
      {
        name: 'California FTB: Personal due dates',
        url: 'https://www.ftb.ca.gov/file/when-to-file/due-dates-personal.html',
      },
      {
        name: 'IRS: 2025 return e-file due dates',
        url: 'https://www.irs.gov/e-file-providers/tax-year-2025-processing-year-2026-form-1040-mef-due-dates',
      },
    ],
    journalHref: '/article/california-tax-extension-deadline-2026-october-15',
  },
  {
    id: 'voter-registration-2026',
    date: '2026-10-19',
    category: 'Elections',
    kind: 'Deadline',
    title: 'Standard voter-registration deadline',
    summary:
      'October 19 is the last day to register online or have a paper registration application postmarked for the November 3 general election.',
    action:
      'Register or confirm the record through the Secretary of State; conditional registration remains available after this date.',
    sources: [electionDatesSource, electionOverviewSource],
    journalHref: '/article/california-2026-general-election-deadlines',
  },
  {
    id: 'conditional-registration-2026',
    date: '2026-10-20',
    endDate: '2026-11-03',
    category: 'Elections',
    kind: 'Start date',
    title: 'Conditional voter registration begins',
    summary:
      'Eligible voters who miss the standard deadline can conditionally register and cast a provisional ballot from October 20 through Election Day.',
    action:
      'Confirm the participating county office, polling location or vote center before traveling.',
    sources: [electionDatesSource],
    journalHref: '/article/california-2026-general-election-deadlines',
  },
  {
    id: 'voter-choice-centers-2026',
    date: '2026-10-24',
    category: 'Elections',
    kind: 'Start date',
    title: 'First Voter’s Choice Act vote centers open',
    summary:
      'The first vote centers open in participating Voter’s Choice Act counties on October 24; other early-voting schedules vary by county.',
    action:
      'Use the official locator to verify whether the county participates and which centers are open.',
    sources: [electionOverviewSource, electionDatesSource],
    journalHref: '/article/california-2026-general-election-deadlines',
  },
  {
    id: 'replacement-ballot-request-2026',
    date: '2026-10-27',
    category: 'Elections',
    kind: 'Recommended date',
    title: 'Replacement vote-by-mail ballot request',
    summary:
      'October 27 is the state’s recommended date to submit a replacement-ballot application. It is guidance, not a final cutoff for every later ballot problem.',
    action:
      'Contact the county elections office immediately if a ballot is missing, lost or destroyed.',
    sources: [
      {
        name: 'California Secretary of State: Election Dates and Resources',
        url: 'https://www.sos.ca.gov/elections/voting-resources/voting-california/election-dates-and-resources',
      },
    ],
    journalHref: '/article/track-california-mail-ballot-2026-fix-problems',
  },
  {
    id: 'general-election-day-2026',
    date: '2026-11-03',
    category: 'Elections',
    kind: 'Deadline',
    title: 'California General Election Day',
    summary:
      'Polls are open from 7 a.m. to 8 p.m. Vote-by-mail ballots must be postmarked on or before November 3; personally returned ballots must arrive by 8 p.m.',
    action:
      'If mailing on Election Day, obtain a hand-stamped postmark from a postal employee inside a U.S. Post Office.',
    sources: [electionOverviewSource, electionDatesSource],
    journalHref: '/article/california-2026-general-election-deadlines',
  },
  {
    id: 'mailed-ballot-receipt-2026',
    date: '2026-11-10',
    category: 'Elections',
    kind: 'Deadline',
    title: 'Mailed ballot receipt deadline',
    summary:
      'A mailed vote-by-mail ballot postmarked on or before Election Day must reach the county elections office no later than November 10.',
    action:
      'Use Where’s My Ballot or the county ballot-status system to confirm receipt and acceptance.',
    sources: [electionDatesSource],
    journalHref: '/article/track-california-mail-ballot-2026-fix-problems',
  },
  {
    id: 'signature-cure-2026',
    date: '2026-11-25',
    category: 'Elections',
    kind: 'Deadline',
    title: 'Ballot signature-cure statements due',
    summary:
      'A completed statement addressing a missing or noncomparable vote-by-mail envelope signature must reach the county elections office by 5 p.m. on November 25.',
    action:
      'Follow the instructions for the county that holds the voter record; county procedures can differ.',
    sources: [
      {
        name: 'California Secretary of State: Verify My Signature',
        url: 'https://www.sos.ca.gov/elections/voter-registration/vote-mail/verify-my-signature',
      },
    ],
    journalHref: '/article/track-california-mail-ballot-2026-fix-problems',
  },
  {
    id: 'county-election-certification-2026',
    date: '2026-12-03',
    category: 'Elections',
    kind: 'Deadline',
    title: 'County election results certification',
    summary:
      'December 3 is the last day for county elections officials to certify their general-election results.',
    action:
      'Treat election-night and canvass-period totals as unofficial until the applicable certification is complete.',
    sources: [electionDatesSource],
    journalHref: '/article/california-2026-general-election-deadlines',
  },
  {
    id: 'state-election-certification-2026',
    date: '2026-12-11',
    category: 'Elections',
    kind: 'Deadline',
    title: 'California Statement of Vote certification',
    summary:
      'The Secretary of State’s certified Statement of Vote and certificates of election are scheduled for December 11.',
    action:
      'Use the certified state record for final statewide results.',
    sources: [electionDatesSource],
    journalHref: '/article/california-2026-general-election-deadlines',
  },
  {
    id: 'minimum-wage-2027',
    date: '2027-01-01',
    category: 'Workplace',
    kind: 'Change',
    title: 'California minimum wage becomes $17.40',
    summary:
      'The statewide minimum wage rises to $17.40 an hour. The associated minimum salary threshold for many overtime exemptions becomes $72,384; duties tests and other requirements still apply.',
    action:
      'Check the work location, industry, pay rate and applicable local rule; some local or industry rates are higher.',
    sources: [
      {
        name: 'California DIR: 2027 minimum wage announcement',
        url: 'https://www.dir.ca.gov/DIRNews/2026/2026-66.html',
      },
    ],
    journalHref: '/article/california-minimum-wage-2027-rate-exempt-salary',
  },
  {
    id: 'estimated-tax-january-2027',
    date: '2027-01-15',
    category: 'Taxes',
    kind: 'Deadline',
    title: 'Fourth estimated-tax installment',
    summary:
      'January 15 is the general fourth-installment date for 2026 federal estimated tax and the California schedule’s fourth payment. Filing early can change the federal or state January-payment requirement in qualifying cases.',
    action:
      'Use the applicable federal and California worksheets; confirm any early-filing, farming, fishing or fiscal-year exception.',
    sources: [
      {
        name: 'IRS: Publication 505 for 2026',
        url: 'https://www.irs.gov/publications/p505',
      },
      {
        name: 'California FTB: 2026 Form 540-ES instructions',
        url: 'https://www.ftb.ca.gov/forms/2026/2026-540-es-instructions.html',
      },
    ],
  },
];

function escapeIcs(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll(/\r?\n/g, '\\n');
}

function compactDate(date: string, addDay = false) {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (addDay) parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10).replaceAll('-', '');
}

function foldIcsLine(line: string) {
  const parts: string[] = [];
  for (let index = 0; index < line.length; index += 72) {
    parts.push(`${index === 0 ? '' : ' '}${line.slice(index, index + 72)}`);
  }
  return parts.join('\r\n');
}

export function buildCaliforniaDeadlineCalendar() {
  const events = californiaDeadlines.flatMap((deadline) => [
    'BEGIN:VEVENT',
    `UID:gcj-california-deadline-${deadline.id}@goldencoastjournal.com`,
    'DTSTAMP:20260914T144500Z',
    `DTSTART;VALUE=DATE:${compactDate(deadline.date)}`,
    `DTEND;VALUE=DATE:${compactDate(deadline.endDate || deadline.date, true)}`,
    `SUMMARY:${escapeIcs(deadline.title)}`,
    `DESCRIPTION:${escapeIcs(`${deadline.summary} ${deadline.action}`)}`,
    `URL:https://www.goldencoastjournal.com/california-deadlines#${deadline.id}`,
    'STATUS:CONFIRMED',
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
  ]);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Golden Coast Journal//California Deadlines//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:California Deadlines from The Golden Coast Journal',
    ...events,
    'END:VCALENDAR',
    '',
  ]
    .map(foldIcsLine)
    .join('\r\n');
}
