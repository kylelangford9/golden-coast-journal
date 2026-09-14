'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

export function DeadlineHubLink({ articleSlug }: { articleSlug: string }) {
  function recordSelection() {
    const metadata = {
      surface: 'article_deadline_utility',
      article_slug: articleSlug,
    };
    track('Deadline Tracker Selected', metadata);
    trackPortfolioGrowth('deadline_tracker_selected', metadata);
  }

  return (
    <aside className="deadline-hub-callout" aria-labelledby="deadline-hub-callout-title">
      <div>
        <p className="eyebrow">California deadline tracker</p>
        <h2 id="deadline-hub-callout-title">
          Put this date beside the rest of the calendar.
        </h2>
        <p>
          Filter current election, tax and workplace dates; open the official
          sources or add the full list to your calendar.
        </p>
      </div>
      <Link href="/california-deadlines" onClick={recordSelection}>
        Open the tracker <ArrowRight aria-hidden="true" />
      </Link>
    </aside>
  );
}
