'use client';

import { type SyntheticEvent, useId, useState } from 'react';
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
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
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
      setState(response.ok ? 'success' : 'error');
      if (response.ok && !form.get('website')) {
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

  return (
    <form className="newsletter-form" onSubmit={subscribe}>
      <label htmlFor={emailId}>The Coast, in your inbox</label>
      <p>One concise morning briefing. Free, always.</p>
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
          {state === 'loading' ? 'Joining…' : 'Join free'}
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
        {state === 'success' &&
          'Thanks — your address is saved for the launch edition.'}
        {state === 'error' && 'We couldn’t add you just now. Please try again.'}
      </output>
    </form>
  );
}
