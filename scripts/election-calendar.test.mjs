import assert from 'node:assert/strict';

import {
  buildElectionCalendar,
  electionCalendarEvents,
} from '../lib/election-calendar.ts';

const calendar = buildElectionCalendar();

assert.equal(electionCalendarEvents.length, 9);
assert.ok(calendar.startsWith('BEGIN:VCALENDAR\r\n'));
assert.equal((calendar.match(/BEGIN:VEVENT/g) || []).length, 9);
assert.ok(calendar.includes('DTSTART;VALUE=DATE:20261019'));
assert.ok(calendar.includes('DTSTART;VALUE=DATE:20261103'));
assert.ok(calendar.includes('DTSTART;VALUE=DATE:20261125'));
assert.ok(calendar.endsWith('END:VCALENDAR\r\n'));

console.log(
  'PASS California election calendar contains nine sourced deadlines',
);
