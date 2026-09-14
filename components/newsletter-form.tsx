'use client';

import { type SyntheticEvent, useId, useState } from 'react';
import { Link2, Share2 } from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

type NewsletterFormProps = {
  placement?: 'homepage' | 'article';
  articleSlug?: string;
};

export function NewsletterForm({
  placement = 'homepage',
  articleSlug,
}: NewsletterFormProps) {
  const [state, setState] = useState<
    'idle' | 'loading' | 'created' | 'existing' | 'error'
  >('idle');
  const [shareStatus, setShareStatus] = useState('');
  const formId = useId();
  const emailId = `${formId}-email`;

  async function subscribe(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState('loading');
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          website: form.get('website'),
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        created?: boolean;
      } | null;
      const created = response.ok && result?.created === true;
      setState(response.ok ? (created ? 'created' : 'existing') : 'error');
      if (created && !form.get('website')) {
        const metadata = {
          placement,
          ...(articleSlug ? { article_slug: articleSlug } : {}),
        };
        track('Newsletter Signup', metadata);
        trackPortfolioGrowth('newsletter_signup', metadata);
      }
    } catch {
      setState('error');
    }
  }

  function invitationUrl() {
    const url = new URL('/', window.location.origin);
    url.searchParams.set('utm_source', 'subscriber_invite');
    url.searchParams.set('utm_medium', 'referral');
    url.searchParams.set('utm_campaign', 'journal_reader_referral');
    url.searchParams.set('utm_content', placement);
    return url.toString();
  }

  function recordShare(method: 'native' | 'copy') {
    const metadata = {
      method,
      surface: 'newsletter_success',
      placement,
      ...(articleSlug ? { article_slug: articleSlug } : {}),
    };
    track('Newsletter Invite Started', metadata);
    trackPortfolioGrowth('share_started', metadata);
  }

  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(invitationUrl());
      recordShare('copy');
      setShareStatus('Invitation link copied.');
    } catch {
      setShareStatus('Copy failed. Please copy the address from your browser.');
    }
  }

  async function shareInvitation() {
    if (!navigator.share) {
      await copyInvitation();
      return;
    }
    try {
      recordShare('native');
      await navigator.share({
        title: 'The Golden Coast Journal',
        text: 'A concise, independent morning briefing from California to the world.',
        url: invitationUrl(),
      });
      setShareStatus('Share options opened.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus('Sharing is unavailable. Copy the invitation link instead.');
    }
  }

  return (
    <form className="newsletter-form" onSubmit={subscribe}>
      <label htmlFor={emailId}>The Coast, in your inbox</label>
      <p>Join the launch list for concise editions and major California updates. Free.</p>
      <div>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
        />
        <button type="submit" disabled={state === 'loading'}>
          {state === 'loading' ? 'Joining…' : 'Join launch list'}
        </button>
      </div>
      <input
        className="form-trap"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <output aria-live="polite">
        {state === 'created' &&
          'Thanks — your address is saved for the launch edition.'}
        {state === 'existing' && 'You’re already on the launch list.'}
        {state === 'error' && 'We couldn’t add you just now. Please try again.'}
      </output>
      {state === 'created' && (
        <div className="newsletter-invite">
          <p>Know another reader who values a calm, concise briefing?</p>
          <div>
            <button type="button" onClick={() => void shareInvitation()}>
              <Share2 size={15} aria-hidden="true" /> Invite a reader
            </button>
            <button type="button" onClick={() => void copyInvitation()}>
              <Link2 size={15} aria-hidden="true" /> Copy invitation
            </button>
          </div>
          <output aria-live="polite">{shareStatus}</output>
        </div>
      )}
    </form>
  );
}
