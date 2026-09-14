'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

const CHECKPOINT_PREFIX = 'gcj_homepage_story_selected_';

export function HomepageStoryLink({
  href,
  articleSlug,
  surface,
  className,
  ariaLabel,
  children,
}: {
  href: string;
  articleSlug: string;
  surface: 'lead_headline' | 'lead_image' | 'lead_cta';
  className?: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  function recordSelection() {
    const checkpoint = `${CHECKPOINT_PREFIX}${articleSlug}`;
    try {
      if (window.sessionStorage.getItem(checkpoint)) return;
      window.sessionStorage.setItem(checkpoint, '1');
    } catch {
      // Measurement must never prevent access to the reporting.
    }

    const metadata = {
      article_slug: articleSlug,
      surface,
    };
    track('Homepage Story Selected', metadata);
    trackPortfolioGrowth('homepage_story_selected', metadata);
  }

  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      onClick={recordSelection}
    >
      {children}
    </Link>
  );
}
