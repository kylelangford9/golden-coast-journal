'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

const sessionKey = 'gcj_author_profile_viewed_kyle_langford';

export function AuthorProfileTracker() {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(sessionKey)) return;
      window.sessionStorage.setItem(sessionKey, '1');
    } catch {
      // Analytics should not interfere with reading when storage is unavailable.
    }

    const metadata = { author: 'kyle-langford' };
    track('Author Profile Viewed', metadata);
    trackPortfolioGrowth('author_profile_viewed', metadata);
  }, []);

  return null;
}
