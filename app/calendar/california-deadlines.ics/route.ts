import { buildCaliforniaDeadlineCalendar } from '@/lib/california-deadlines';

export const dynamic = 'force-static';

export function GET() {
  return new Response(buildCaliforniaDeadlineCalendar(), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition':
        'attachment; filename="golden-coast-journal-california-deadlines.ics"',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
