'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

export function CandidateGuideLink({
  placement,
  className,
  children = 'Open the candidate guide',
}: {
  placement: 'homepage' | 'propositions' | 'deadlines' | 'article';
  className?: string;
  children?: React.ReactNode;
}) {
  function recordSelection() {
    const metadata = {
      surface: placement,
      destination: 'california_candidates_2026',
    };
    track('Candidate Guide Selected', metadata);
    trackPortfolioGrowth('candidate_guide_selected', metadata);
  }

  return (
    <Link
      href="/california-candidates-2026"
      className={className}
      onClick={recordSelection}
    >
      {children} <ArrowRight aria-hidden="true" />
    </Link>
  );
}
