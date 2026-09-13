'use client';

import { useState } from 'react';
import { Link2, Share2 } from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

type ArticleShareProps = {
  origin: string;
  slug: string;
  title: string;
};

function attributedUrl(origin: string, slug: string) {
  const url = new URL(`/article/${slug}`, origin);
  url.searchParams.set('utm_source', 'reader_share');
  url.searchParams.set('utm_medium', 'referral');
  url.searchParams.set('utm_campaign', 'journal_reader_referral');
  url.searchParams.set('utm_content', slug);
  return url.toString();
}

export function ArticleShare({ origin, slug, title }: ArticleShareProps) {
  const [status, setStatus] = useState('');
  const url = attributedUrl(origin, slug);

  function record(method: 'native' | 'copy') {
    const metadata = { method, article_slug: slug };
    track('Article Share Started', metadata);
    trackPortfolioGrowth('share_started', metadata);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      record('copy');
      setStatus('Tracked link copied.');
    } catch {
      setStatus('Copy failed. Please copy the address from your browser.');
    }
  }

  async function shareStory() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      record('native');
      await navigator.share({ title, text: title, url });
      setStatus('Share options opened.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus(
        'Sharing is unavailable. You can copy the tracked link instead.',
      );
    }
  }

  return (
    <div className="article-share" aria-label="Share this story">
      <span>Share this report</span>
      <button type="button" onClick={() => void shareStory()}>
        <Share2 size={15} aria-hidden="true" /> Share story
      </button>
      <button type="button" onClick={() => void copyLink()}>
        <Link2 size={15} aria-hidden="true" /> Copy link
      </button>
      <output aria-live="polite">{status}</output>
    </div>
  );
}
