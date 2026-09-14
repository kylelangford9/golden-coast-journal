'use client';

import { CalendarPlus } from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

const calendarPath = '/calendar/california-2026-general-election.ics';
const checkpointKey = 'gcj_election_calendar_downloaded_2026';

export function ElectionCalendarDownload() {
  function recordDownload() {
    try {
      if (window.sessionStorage.getItem(checkpointKey)) return;
      window.sessionStorage.setItem(checkpointKey, '1');
    } catch {
      // A storage restriction must not block the calendar download.
    }
    const metadata = {
      surface: 'election_deadline_article',
      calendar: 'california_2026_general_election',
    };
    track('Election Calendar Downloaded', metadata);
    trackPortfolioGrowth('election_calendar_downloaded', metadata);
  }

  return (
    <aside
      className="election-calendar"
      aria-labelledby="election-calendar-title"
    >
      <div>
        <p className="eyebrow">Reader utility</p>
        <h2 id="election-calendar-title">
          Keep the statewide dates on your calendar
        </h2>
        <p>
          Download nine all-day reminders from ballot mailing through state
          certification. County locations, hours and individual voter records
          still require an official check.
        </p>
      </div>
      <a href={calendarPath} download onClick={recordDownload}>
        <CalendarPlus size={17} aria-hidden="true" /> Add 2026 dates
      </a>
    </aside>
  );
}
