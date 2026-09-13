'use client';

import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

export function TrackedNetworkLink({
  href,
  destination,
  children,
}: {
  href: string;
  destination: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        track('Network Referral', {
          destination,
          placement: 'journal_footer',
        });
        trackPortfolioGrowth('network_referral', {
          destination,
          placement: 'journal_footer',
        });
      }}
    >
      {children}
    </a>
  );
}
