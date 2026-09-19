'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  emptyReaderPollResult,
  findReaderPoll,
  type ReaderPollResult,
} from '@/lib/polls';
import { trackPortfolioGrowth } from '@/lib/growth-client';

type ReaderPulseProps = {
  pollId: string;
  compact?: boolean;
};

function browserToken() {
  const storageKey = 'gcj_reader_poll_token';
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(storageKey, created);
  return created;
}

export function ReaderPulse({ pollId, compact = false }: ReaderPulseProps) {
  const definition = useMemo(() => findReaderPoll(pollId), [pollId]);
  const [result, setResult] = useState<ReaderPollResult | null>(
    definition ? emptyReaderPollResult(definition) : null,
  );
  const [choice, setChoice] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!definition) return;
    queueMicrotask(() => {
      setChoice(window.localStorage.getItem(`gcj_poll_choice_${pollId}`));
    });
    const controller = new AbortController();
    fetch('/api/polls', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Poll results unavailable');
        return response.json() as Promise<{ polls: ReaderPollResult[] }>;
      })
      .then((payload) => {
        const current = payload.polls.find((poll) => poll.id === pollId);
        if (current) setResult(current);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setStatus('Live totals are temporarily unavailable; voting can be retried.');
      });
    return () => controller.abort();
  }, [definition, pollId]);

  if (!definition || !result) return null;
  const question = definition.question;

  function shareUrl() {
    const url = new URL(window.location.href);
    url.hash = `reader-pulse-${pollId}`;
    url.searchParams.set('utm_source', 'reader_referral');
    url.searchParams.set('utm_medium', 'referral');
    url.searchParams.set('utm_campaign', 'journal_reader_poll');
    url.searchParams.set('utm_content', pollId);
    return url.toString();
  }

  function recordShare(method: 'native' | 'copy') {
    const metadata = {
      method,
      poll_id: pollId,
      surface: 'reader_pulse',
    };
    track('Reader Poll Shared', metadata);
    trackPortfolioGrowth('share_started', metadata);
  }

  async function copyQuestion() {
    try {
      await navigator.clipboard.writeText(shareUrl());
      recordShare('copy');
      setShareStatus('Question link copied.');
    } catch {
      setShareStatus('Copy failed; please copy the address from your browser.');
    }
  }

  async function shareQuestion() {
    if (!navigator.share) {
      await copyQuestion();
      return;
    }
    try {
      await navigator.share({
        title: 'Reader pulse | The Golden Coast Journal',
        text: question,
        url: shareUrl(),
      });
      recordShare('native');
      setShareStatus('Question shared.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareStatus('Sharing is unavailable; copy the question link instead.');
    }
  }

  async function vote(optionId: string) {
    if (choice || submitting) return;
    setSubmitting(true);
    setStatus('Recording your response.');
    try {
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pollId,
          optionId,
          voterToken: browserToken(),
        }),
      });
      const payload = (await response.json()) as {
        accepted?: boolean;
        poll?: ReaderPollResult;
        error?: string;
      };
      if (!response.ok || !payload.poll) {
        throw new Error(payload.error || 'Vote could not be recorded');
      }
      setResult(payload.poll);
      if (payload.accepted) {
        setChoice(optionId);
        window.localStorage.setItem(`gcj_poll_choice_${pollId}`, optionId);
        const metadata = { poll_id: pollId, surface: 'reader_pulse' };
        track('Reader Poll Voted', metadata);
        trackPortfolioGrowth('reader_poll_voted', metadata);
        setStatus('Response recorded; thank you.');
      } else {
        setStatus('This browser has already responded to this question.');
      }
    } catch {
      setStatus('Your response was not recorded; please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className={`reader-pulse${compact ? ' reader-pulse-compact' : ''}`}
      aria-labelledby={`reader-pulse-${pollId}`}
    >
      <div className="reader-pulse-visual photo-frame">
        <Image
          src="/oroville.jpg"
          alt="Aerial photograph of Lake Oroville and the surrounding California foothills"
          fill
          sizes="(max-width: 760px) 100vw, 640px"
          loading="lazy"
        />
        <span className="photo-caption">
          Photograph · Florence Low / California Department of Water Resources
        </span>
      </div>
      <div className="reader-pulse-heading">
        <div>
          <p className="eyebrow">Reader pulse</p>
          <h2 id={`reader-pulse-${pollId}`}>{definition.question}</h2>
        </div>
        <p>{definition.context}</p>
      </div>
      <div className="reader-pulse-options">
        {result.options.map((option) => {
          const percentage = result.totalVotes
            ? Math.round((option.votes / result.totalVotes) * 100)
            : 0;
          const selected = choice === option.id;
          return (
            <div className="reader-pulse-option" key={option.id}>
              <Button
                type="button"
                variant="outline"
                disabled={Boolean(choice) || submitting}
                aria-pressed={selected}
                onClick={() => void vote(option.id)}
              >
                <span className="reader-pulse-option-copy">
                  <span>
                    {selected && <Check aria-hidden="true" />}
                    {option.label}
                  </span>
                  <strong>{percentage}%</strong>
                </span>
              </Button>
              <Progress value={percentage} aria-label={`${option.label}: ${percentage}%`} />
            </div>
          );
        })}
      </div>
      <div className="reader-pulse-footnote">
        <p>
          {result.totalVotes
            ? `${result.totalVotes} reader ${result.totalVotes === 1 ? 'response' : 'responses'}`
            : 'No responses yet; be the first.'}
        </p>
        <p>One response per poll per browser; results are directional, not scientific.</p>
      </div>
      <output className="reader-pulse-status" aria-live="polite">
        {status}
      </output>
      {choice && (
        <div className="reader-pulse-followup">
          <p>
            Bring another reader into the question; shared links never include
            your answer.
          </p>
          <div>
            <Button type="button" onClick={() => void shareQuestion()}>
              <Share2 aria-hidden="true" /> Share question
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyQuestion()}
            >
              <Link2 aria-hidden="true" /> Copy link
            </Button>
          </div>
          <output aria-live="polite">{shareStatus}</output>
        </div>
      )}
    </section>
  );
}
