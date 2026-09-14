'use client';

import { useState } from 'react';
import { Link2, Share2 } from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { Button } from '@/components/ui/button';
import { trackPortfolioGrowth } from '@/lib/growth-client';

type PropositionShareProps = {
  origin: string;
  number: number;
  title: string;
};

function attributedUrl(origin: string, number: number) {
  const url = new URL(`/california-propositions-2026/${number}`, origin);
  url.searchParams.set('utm_source', 'reader_share');
  url.searchParams.set('utm_medium', 'referral');
  url.searchParams.set('utm_campaign', 'journal_proposition_referral');
  url.searchParams.set('utm_content', `proposition-${number}`);
  return url.toString();
}

export function PropositionShare({
  origin,
  number,
  title,
}: PropositionShareProps) {
  const [status, setStatus] = useState('');
  const url = attributedUrl(origin, number);

  function record(method: 'native' | 'copy') {
    const metadata = {
      method,
      proposition_number: number,
      surface: 'proposition_detail_page',
    };
    track('Proposition Share Started', metadata);
    trackPortfolioGrowth('share_started', metadata);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      record('copy');
      setStatus('Tracked guide link copied.');
    } catch {
      setStatus('Copy failed. Please copy the address from your browser.');
    }
  }

  async function shareGuide() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      record('native');
      await navigator.share({
        title,
        text: `${title}; a neutral guide from The Golden Coast Journal.`,
        url,
      });
      setStatus('Share options opened.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus(
        'Sharing is unavailable. You can copy the tracked link instead.',
      );
    }
  }

  return (
    <div className="article-share proposition-share" aria-label="Share this proposition guide">
      <span>Share this guide</span>
      <Button type="button" variant="outline" onClick={() => void shareGuide()}>
        <Share2 aria-hidden="true" /> Share guide
      </Button>
      <Button type="button" variant="outline" onClick={() => void copyLink()}>
        <Link2 aria-hidden="true" /> Copy link
      </Button>
      <output aria-live="polite">{status}</output>
    </div>
  );
}
