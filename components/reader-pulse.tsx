'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
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
    </section>
  );
}
