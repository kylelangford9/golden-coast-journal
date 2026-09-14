'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  ExternalLink,
  RotateCcw,
  Search,
} from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import type {
  CaliforniaProposition,
  PropositionTopic,
} from '@/lib/california-propositions';
import { propositionTopics } from '@/lib/california-propositions';
import { trackPortfolioGrowth } from '@/lib/growth-client';

const storageKey = 'gcj_california_propositions_2026_reviewed';

function record(
  eventName: string,
  analyticsName: string,
  metadata: Record<string, string | number> = {},
) {
  const detail = { surface: 'california_propositions_2026', ...metadata };
  track(analyticsName, detail);
  trackPortfolioGrowth(eventName, detail);
}

function recordOnce(
  eventName: string,
  analyticsName: string,
  metadata: Record<string, string | number> = {},
) {
  const key = `gcj_${eventName}_california_propositions_2026`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
  } catch {
    // The guide still works when browser storage is unavailable.
  }
  record(eventName, analyticsName, metadata);
}

export function PropositionGuide({
  propositions,
}: {
  propositions: CaliforniaProposition[];
}) {
  const [topic, setTopic] = useState<'All' | PropositionTopic>('All');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());

  useEffect(() => {
    recordOnce('proposition_guide_opened', 'Proposition Guide Opened');
    queueMicrotask(() => {
      try {
        const stored = JSON.parse(
          window.localStorage.getItem(storageKey) || '[]',
        );
        if (!Array.isArray(stored)) return;
        const allowed = new Set(propositions.map((item) => item.number));
        setReviewed(
          new Set(
            stored.filter(
              (value): value is number =>
                typeof value === 'number' && allowed.has(value),
            ),
          ),
        );
      } catch {
        // The checklist starts empty when stored state cannot be read.
      }
    });
  }, [propositions]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return propositions.filter((proposition) => {
      const matchesTopic =
        topic === 'All' || proposition.topics.includes(topic);
      if (!matchesTopic) return false;
      if (!normalized) return true;
      return [
        `proposition ${proposition.number}`,
        `prop ${proposition.number}`,
        proposition.shortTitle,
        proposition.officialTitle,
        proposition.summary,
        proposition.topics.join(' '),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [propositions, query, topic]);

  function selectTopic(value: 'All' | PropositionTopic) {
    setTopic(value);
    record('proposition_filter_selected', 'Proposition Filter Selected', {
      topic: value.toLowerCase(),
    });
  }

  function toggleExpanded(number: number) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(number)) next.delete(number);
      else {
        next.add(number);
        record('proposition_detail_opened', 'Proposition Detail Opened', {
          proposition_number: number,
        });
      }
      return next;
    });
  }

  function toggleReviewed(number: number) {
    setReviewed((current) => {
      const next = new Set(current);
      const action = next.has(number) ? 'removed' : 'added';
      if (action === 'removed') next.delete(number);
      else next.add(number);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // The checklist remains usable for the current page visit.
      }
      record('proposition_reviewed', 'Proposition Reviewed', {
        action,
        reviewed_count: next.size,
      });
      return next;
    });
  }

  function clearReviewed() {
    setReviewed(new Set());
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // The current page state is already clear.
    }
    record('proposition_checklist_cleared', 'Proposition Checklist Cleared');
  }

  function recordOfficialSource(number: number) {
    record(
      'proposition_official_source_opened',
      'Proposition Official Source Opened',
      { proposition_number: number },
    );
  }

  return (
    <section
      className="proposition-guide"
      aria-labelledby="proposition-guide-title"
    >
      <div className="proposition-guide-status">
        <div>
          <p className="eyebrow">Your review checklist</p>
          <strong>
            {reviewed.size} of {propositions.length} reviewed
          </strong>
          <p>
            Saved only in this browser; the Journal does not receive your list.
          </p>
        </div>
        <Progress
          value={(reviewed.size / propositions.length) * 100}
          aria-label={`${reviewed.size} of ${propositions.length} propositions reviewed`}
        />
        {reviewed.size > 0 && (
          <Button type="button" variant="outline" onClick={clearReviewed}>
            <RotateCcw aria-hidden="true" /> Clear
          </Button>
        )}
      </div>

      <div className="proposition-guide-controls">
        <label htmlFor="proposition-search">
          <span className="visually-hidden">Search propositions</span>
          <Search aria-hidden="true" />
          <Input
            id="proposition-search"
            type="search"
            value={query}
            placeholder="Search by number or issue"
            onFocus={() =>
              recordOnce(
                'proposition_search_started',
                'Proposition Search Started',
              )
            }
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div
          className="proposition-topic-filter"
          aria-label="Filter propositions by issue"
        >
          {propositionTopics.map((item) => (
            <Button
              key={item}
              type="button"
              variant="outline"
              aria-pressed={topic === item}
              onClick={() => selectTopic(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>

      <div className="proposition-guide-results">
        <div>
          <h2 id="proposition-guide-title">
            California propositions on the 2026 ballot
          </h2>
          <p aria-live="polite">
            Showing {visible.length} of {propositions.length} statewide
            measures.
          </p>
        </div>
        <div className="proposition-guide-links">
          <a
            href="https://voterguide.sos.ca.gov/candidates/"
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              record(
                'proposition_election_resource_opened',
                'Election Resource Opened',
                {
                  resource: 'candidate_statements',
                },
              )
            }
          >
            Candidate statements <ExternalLink aria-hidden="true" />
          </a>
          <a
            href="https://www.fppc.ca.gov/transparency/top-contributors.html"
            target="_blank"
            rel="noreferrer"
            onClick={() =>
              record(
                'proposition_election_resource_opened',
                'Election Resource Opened',
                {
                  resource: 'top_contributors',
                },
              )
            }
          >
            Top contributors <ExternalLink aria-hidden="true" />
          </a>
          <Link href="/california-deadlines">Election deadlines</Link>
        </div>
      </div>

      {visible.length ? (
        <ol className="proposition-list">
          {visible.map((proposition) => {
            const isExpanded = expanded.has(proposition.number);
            const isReviewed = reviewed.has(proposition.number);
            const panelId = `proposition-${proposition.number}-details`;
            return (
              <li
                id={`proposition-${proposition.number}`}
                key={proposition.number}
              >
                <div className="proposition-number" aria-hidden="true">
                  <span>Prop</span>
                  <strong>{proposition.number}</strong>
                </div>
                <div className="proposition-card-copy">
                  <p className="eyebrow">
                    {proposition.topics.join('; ')}; {proposition.placedBy}
                  </p>
                  <h3>{proposition.shortTitle}</h3>
                  <p>{proposition.summary}</p>
                  <p className="proposition-official-title">
                    Official title: {proposition.officialTitle}.{' '}
                    {proposition.measureType}.
                  </p>
                  <div className="proposition-card-actions">
                    <Button
                      type="button"
                      variant="outline"
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      onClick={() => toggleExpanded(proposition.number)}
                    >
                      {isExpanded ? 'Hide details' : 'What yes and no mean'}
                      <ChevronDown aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      aria-pressed={isReviewed}
                      onClick={() => toggleReviewed(proposition.number)}
                    >
                      {isReviewed ? (
                        <CheckCircle2 aria-hidden="true" />
                      ) : (
                        <Circle aria-hidden="true" />
                      )}
                      {isReviewed ? 'Reviewed' : 'Mark reviewed'}
                    </Button>
                    <a
                      href={proposition.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => recordOfficialSource(proposition.number)}
                    >
                      Official voter guide <ExternalLink aria-hidden="true" />
                    </a>
                  </div>
                  {isExpanded && (
                    <div className="proposition-consequences" id={panelId}>
                      <div>
                        <span>Yes means</span>
                        <p>{proposition.yesMeans}</p>
                      </div>
                      <div>
                        <span>No means</span>
                        <p>{proposition.noMeans}</p>
                      </div>
                      <div>
                        <span>Fiscal effect</span>
                        <p>{proposition.fiscalEffect}</p>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="proposition-empty">
          <strong>No propositions match that search.</strong>
          <p>
            Try a proposition number, housing, taxes, elections, health or
            environment.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQuery('');
              setTopic('All');
            }}
          >
            Show all propositions
          </Button>
        </div>
      )}

      <div className="proposition-guide-cta">
        <p>
          This checklist records research progress, not a vote choice; confirm
          the final ballot language in the official voter guide.
        </p>
        <a
          href="#newsletter"
          onClick={() =>
            recordOnce(
              'proposition_newsletter_selected',
              'Proposition Newsletter Selected',
            )
          }
        >
          Get the Journal briefing
        </a>
      </div>
    </section>
  );
}
