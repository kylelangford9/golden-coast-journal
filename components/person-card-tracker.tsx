'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

type ToggleEvent = Event & { newState?: string };

/**
 * Counts person cards opened, once per person per story view, so the newsroom
 * can tell whether readers use them. The cards open without this; it only
 * listens.
 */
export function PersonCardTracker({ articleSlug }: { articleSlug: string }) {
  useEffect(() => {
    const seen = new Set<string>();
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>('.person-card[data-person]'),
    );
    const onToggle = (event: Event) => {
      const card = event.currentTarget as HTMLElement;
      const person = card.dataset.person;
      if (
        (event as ToggleEvent).newState !== 'open' ||
        !person ||
        seen.has(person)
      )
        return;
      seen.add(person);
      const metadata = { person_slug: person, article_slug: articleSlug };
      track('Person Card Opened', metadata);
      trackPortfolioGrowth('person_card_opened', metadata);
    };
    for (const card of cards) card.addEventListener('toggle', onToggle);
    return () => {
      for (const card of cards) card.removeEventListener('toggle', onToggle);
    };
  }, [articleSlug]);
  return null;
}
