import { buildElectionCalendar } from '@/lib/election-calendar';

export const dynamic = 'force-static';

export function GET() {
  return new Response(buildElectionCalendar(), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="california-2026-general-election-deadlines.ics"',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
