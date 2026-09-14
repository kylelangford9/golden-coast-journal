'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

export function PropositionGuideLink({
  placement,
  className,
  children = 'Open the proposition guide',
}: {
  placement: 'homepage' | 'article';
  className?: string;
  children?: React.ReactNode;
}) {
  function recordSelection() {
    const metadata = {
      surface: placement,
      destination: 'california_propositions_2026',
    };
    track('Proposition Guide Selected', metadata);
    trackPortfolioGrowth('proposition_guide_selected', metadata);
  }

  return (
    <Link
      href="/california-propositions-2026"
      className={className}
      onClick={recordSelection}
    >
      {children} <ArrowRight aria-hidden="true" />
    </Link>
  );
}
