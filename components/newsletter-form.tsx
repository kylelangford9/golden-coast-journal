'use client';

import { type SyntheticEvent, useState } from 'react';
import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

export function NewsletterForm() {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  async function subscribe(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState('loading');
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), website: form.get('website') }),
      });
      setState(response.ok ? 'success' : 'error');
      if (response.ok && !form.get('website')) {
        track('Newsletter Signup', { placement: 'homepage' });
        trackPortfolioGrowth('newsletter_signup', { placement: 'homepage' });
      }
    } catch {
      setState('error');
    }
  }

  return (
    <form className="newsletter-form" onSubmit={subscribe}>
      <label htmlFor="newsletter-email">The Coast, in your inbox</label>
      <p>One concise morning briefing. Free, always.</p>
      <div>
        <input id="newsletter-email" name="email" type="email" required placeholder="you@example.com" autoComplete="email" />
        <button type="submit" disabled={state === 'loading'}>{state === 'loading' ? 'Joining…' : 'Join free'}</button>
      </div>
      <input className="form-trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <output aria-live="polite">
        {state === 'success' && 'Thanks — your address is saved for the launch edition.'}
        {state === 'error' && 'We couldn’t add you just now. Please try again.'}
      </output>
    </form>
  );
}
