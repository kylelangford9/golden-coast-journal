'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

const CHECKPOINT_KEY = 'gcj_newsletter_cta_clicked_header';

export function NewsletterCtaLink() {
  const pathname = usePathname();
  const hasLocalForm = pathname === '/' || pathname.startsWith('/article/');

  function recordIntent() {
    try {
      if (window.sessionStorage.getItem(CHECKPOINT_KEY)) return;
      window.sessionStorage.setItem(CHECKPOINT_KEY, '1');
    } catch {
      // Measurement must never prevent access to the signup form.
    }
    const metadata = { placement: 'header' };
    track('Newsletter CTA Clicked', metadata);
    trackPortfolioGrowth('newsletter_cta_clicked', metadata);
  }

  return (
    <Link
      className="newsletter-cta-link"
      href={hasLocalForm ? '#newsletter' : '/#newsletter'}
      onClick={recordIntent}
    >
      Subscribe free
    </Link>
  );
}
