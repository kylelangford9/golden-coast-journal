'use client';

import {
  type SyntheticEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { Link2, Share2 } from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

type NewsletterFormProps = {
  placement?:
    | 'homepage'
    | 'article'
    | 'briefing'
    | 'live'
    | 'deadlines'
    | 'propositions'
    | 'candidates'
    | 'election-hub';
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
  const formRef = useRef<HTMLFormElement>(null);
  const checkpointKeys = useRef(new Set<string>());
  const formId = useId();
  const emailId = `${formId}-email`;

  const checkpointMetadata = useCallback(() => {
    return {
      placement,
      ...(articleSlug ? { article_slug: articleSlug } : {}),
    };
  }, [articleSlug, placement]);

  const trackCheckpointOnce = useCallback(
    (
      eventName:
        | 'newsletter_form_viewed'
        | 'newsletter_intent_started'
        | 'newsletter_submit_attempted',
      analyticsName:
        | 'Newsletter Form Viewed'
        | 'Newsletter Intent Started'
        | 'Newsletter Submit Attempted',
    ) => {
      const context = articleSlug || placement;
      const key = `gcj_${eventName}_${context}`;
      if (checkpointKeys.current.has(key)) return;
      try {
        if (window.sessionStorage.getItem(key)) return;
        window.sessionStorage.setItem(key, '1');
      } catch {
        // The in-memory guard still prevents duplicate events for this form.
      }
      checkpointKeys.current.add(key);
      const metadata = checkpointMetadata();
      track(analyticsName, metadata);
      trackPortfolioGrowth(eventName, metadata);
    },
    [articleSlug, checkpointMetadata, placement],
  );

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          !entries.some(
            (entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5,
          )
        )
          return;
        trackCheckpointOnce('newsletter_form_viewed', 'Newsletter Form Viewed');
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(form);
    return () => observer.disconnect();
  }, [trackCheckpointOnce]);

  async function subscribe(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!form.get('website')) {
      trackCheckpointOnce(
        'newsletter_submit_attempted',
        'Newsletter Submit Attempted',
      );
    }
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
      setShareStatus(
        'Sharing is unavailable. Copy the invitation link instead.',
      );
    }
  }

  return (
    <form ref={formRef} className="newsletter-form" onSubmit={subscribe}>
      <label htmlFor={emailId}>California, in your inbox</label>
      <p>
        Useful California reporting; what changed, why it matters and the
        primary source. Free. Unsubscribe anytime.
      </p>
      <ul className="newsletter-assurances" aria-label="Reader briefing promises">
        <li>Primary sources</li>
        <li>No paywall</li>
        <li>No advertising trackers</li>
      </ul>
      <div>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
          onChange={(event) => {
            if (!event.currentTarget.value.trim()) return;
            trackCheckpointOnce(
              'newsletter_intent_started',
              'Newsletter Intent Started',
            );
          }}
        />
        <button type="submit" disabled={state === 'loading'}>
          {state === 'loading' ? 'Saving…' : 'Get the briefing'}
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
          'Thanks; your address is saved for the next briefing.'}
        {state === 'existing' && 'You’re already on the reader list.'}
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
