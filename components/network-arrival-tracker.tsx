'use client';

import { useEffect } from 'react';
import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

export function NetworkArrivalTracker() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('utm_campaign') !== 'project_network') return;

    track('Network Arrival', {
      source: params.get('utm_source') || 'unknown',
      medium: params.get('utm_medium') || 'referral',
      landingPath: window.location.pathname,
    });
    trackPortfolioGrowth('network_arrival', {
      source: params.get('utm_source') || 'unknown',
      medium: params.get('utm_medium') || 'referral',
      landingPath: window.location.pathname,
    });
  }, []);

  return null;
}
