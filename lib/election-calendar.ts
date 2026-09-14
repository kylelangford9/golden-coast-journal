export const electionCalendarSource =
  'https://www.sos.ca.gov/elections/upcoming-elections/general-election-november-3-2026/key-dates-deadlines';

export const electionCalendarEvents = [
  {
    start: '20261005',
    end: '20261006',
    title: 'California ballots begin mailing and early voting begins',
    description:
      'Counties begin mailing vote-by-mail ballots no later than October 5. Early voting begins.',
  },
  {
    start: '20261019',
    end: '20261020',
    title: 'California standard voter registration deadline',
    description:
      'Last day to register online or have a paper voter registration application postmarked.',
  },
  {
    start: '20261020',
    end: '20261021',
    title: 'California conditional voter registration begins',
    description:
      'Eligible voters who missed the standard deadline can use conditional registration through Election Day.',
  },
  {
    start: '20261024',
    end: '20261025',
    title: 'First California Voter Choice Act vote centers open',
    description:
      'The first vote centers open in participating Voter Choice Act counties. Confirm local locations and hours.',
  },
  {
    start: '20261103',
    end: '20261104',
    title: 'California General Election Day',
    description:
      'Polls close at 8 p.m. Vote-by-mail ballots must be postmarked on or before this date.',
  },
  {
    start: '20261110',
    end: '20261111',
    title: 'California mailed-ballot receipt deadline',
    description:
      'Vote-by-mail ballots postmarked by Election Day must reach the county elections office by this date.',
  },
  {
    start: '20261125',
    end: '20261126',
    title: 'California ballot signature-cure deadline',
    description:
      'Signature verification statements must reach the county elections office by 5 p.m.',
  },
  {
    start: '20261203',
    end: '20261204',
    title: 'California county election certification deadline',
    description:
      'County elections officials must certify their election results by this date.',
  },
  {
    start: '20261211',
    end: '20261212',
    title: 'California certified Statement of Vote scheduled',
    description:
      'The California Secretary of State is scheduled to publish the certified Statement of Vote.',
  },
] as const;

function escapeIcs(value: string) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replaceAll(/\r?\n/g, '\\n');
}

function foldIcsLine(line: string) {
  const parts: string[] = [];
  for (let index = 0; index < line.length; index += 72) {
    parts.push(`${index === 0 ? '' : ' '}${line.slice(index, index + 72)}`);
  }
  return parts.join('\r\n');
}

export function buildElectionCalendar() {
  const events = electionCalendarEvents.flatMap((event, index) => [
    'BEGIN:VEVENT',
    `UID:gcj-ca-2026-${index + 1}@goldencoastjournal.com`,
    'DTSTAMP:20260914T095200Z',
    `DTSTART;VALUE=DATE:${event.start}`,
    `DTEND;VALUE=DATE:${event.end}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    `URL:${electionCalendarSource}`,
    'STATUS:CONFIRMED',
    'TRANSP:TRANSPARENT',
    'END:VEVENT',
  ]);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Golden Coast Journal//California Election Calendar 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:California 2026 General Election Deadlines',
    ...events,
    'END:VCALENDAR',
    '',
  ]
    .map(foldIcsLine)
    .join('\r\n');
}
