'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  RotateCcw,
  Search,
} from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  candidateCategories,
  type CaliforniaCandidateOffice,
  type CandidateCategory,
} from '@/lib/california-candidates';
import { trackPortfolioGrowth } from '@/lib/growth-client';

const storageKey = 'gcj_california_candidate_offices_2026_reviewed';

function record(
  eventName: string,
  analyticsName: string,
  metadata: Record<string, string | number> = {},
) {
  const detail = { surface: 'california_candidates_2026', ...metadata };
  track(analyticsName, detail);
  trackPortfolioGrowth(eventName, detail);
}

function recordOnce(
  eventName: string,
  analyticsName: string,
  metadata: Record<string, string | number> = {},
) {
  const key = `gcj_${eventName}_california_candidates_2026`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
  } catch {
    // The guide still works when browser storage is unavailable.
  }
  record(eventName, analyticsName, metadata);
}

export function CandidateGuide({
  offices,
}: {
  offices: CaliforniaCandidateOffice[];
}) {
  const [category, setCategory] = useState<'All' | CandidateCategory>('All');
  const [query, setQuery] = useState('');
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  useEffect(() => {
    recordOnce('candidate_guide_opened', 'Candidate Guide Opened');
    queueMicrotask(() => {
      try {
        const stored = JSON.parse(
          window.localStorage.getItem(storageKey) || '[]',
        );
        if (!Array.isArray(stored)) return;
        const allowed = new Set(offices.map((office) => office.id));
        setReviewed(
          new Set(
            stored.filter(
              (value): value is string =>
                typeof value === 'string' && allowed.has(value),
            ),
          ),
        );
      } catch {
        // The checklist starts empty when stored state cannot be read.
      }
    });
  }, [offices]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return offices.flatMap((office) => {
      if (category !== 'All' && office.category !== category) return [];
      const officeMatches = [
        office.name,
        office.category,
        office.responsibility,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
      const candidates = normalized
        ? office.candidates.filter((candidate) =>
            [candidate.name, candidate.party, candidate.district || '']
              .join(' ')
              .toLowerCase()
              .includes(normalized),
          )
        : office.candidates;
      if (!normalized || officeMatches || candidates.length) {
        return [
          {
            office,
            candidates: officeMatches ? office.candidates : candidates,
          },
        ];
      }
      return [];
    });
  }, [category, offices, query]);

  const visibleCandidates = visible.reduce(
    (total, result) => total + result.candidates.length,
    0,
  );

  function selectCategory(value: 'All' | CandidateCategory) {
    setCategory(value);
    record(
      'candidate_office_filter_selected',
      'Candidate Office Filter Selected',
      {
        category: value.toLowerCase(),
      },
    );
  }

  function toggleReviewed(officeId: string) {
    setReviewed((current) => {
      const next = new Set(current);
      const action = next.has(officeId) ? 'removed' : 'added';
      if (action === 'removed') next.delete(officeId);
      else next.add(officeId);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // The checklist remains usable for the current page visit.
      }
      record('candidate_office_reviewed', 'Candidate Office Reviewed', {
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
    record('candidate_checklist_cleared', 'Candidate Checklist Cleared');
  }

  function recordOfficialSource(officeId: string) {
    record(
      'candidate_official_source_opened',
      'Candidate Official Source Opened',
      { office: officeId },
    );
  }

  return (
    <section
      className="candidate-guide"
      aria-labelledby="candidate-guide-title"
    >
      <div className="candidate-guide-status">
        <div>
          <p className="eyebrow">Your office checklist</p>
          <strong>
            {reviewed.size} of {offices.length} offices reviewed
          </strong>
          <p>
            Saved only in this browser; the Journal does not receive your list.
          </p>
        </div>
        <Progress
          value={(reviewed.size / offices.length) * 100}
          aria-label={`${reviewed.size} of ${offices.length} candidate offices reviewed`}
        />
        {reviewed.size > 0 && (
          <Button type="button" variant="outline" onClick={clearReviewed}>
            <RotateCcw aria-hidden="true" /> Clear
          </Button>
        )}
      </div>

      <div className="candidate-guide-controls">
        <label htmlFor="candidate-search">
          <span className="visually-hidden">Search candidates and offices</span>
          <Search aria-hidden="true" />
          <Input
            id="candidate-search"
            type="search"
            value={query}
            placeholder="Search a candidate or office"
            onFocus={() =>
              recordOnce('candidate_search_started', 'Candidate Search Started')
            }
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div
          className="candidate-category-filter"
          aria-label="Filter candidate offices"
        >
          {candidateCategories.map((item) => (
            <Button
              key={item}
              type="button"
              variant="outline"
              aria-pressed={category === item}
              onClick={() => selectCategory(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>

      <div className="candidate-guide-results">
        <div>
          <h2 id="candidate-guide-title">
            Candidates in California’s statewide voter guide
          </h2>
          <p aria-live="polite">
            Showing {visibleCandidates} candidates across {visible.length}{' '}
            {visible.length === 1 ? 'office' : 'offices'}.
          </p>
        </div>
        <a
          className="candidate-ballot-tool"
          href="https://californiavoters.live/?utm_source=golden_coast_journal&utm_medium=referral&utm_campaign=california_candidates_2026&utm_content=personalized_ballot"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            record(
              'candidate_ballot_tool_selected',
              'Candidate Ballot Tool Selected',
              { destination: 'california_voters' },
            )
          }
        >
          Find my district ballot <ExternalLink aria-hidden="true" />
        </a>
      </div>

      {visible.length ? (
        <div className="candidate-office-list">
          {visible.map(({ office, candidates }) => {
            const isReviewed = reviewed.has(office.id);
            return (
              <article
                id={office.id}
                className="candidate-office"
                key={office.id}
              >
                <div className="candidate-office-heading">
                  <div>
                    <p className="eyebrow">
                      {office.category}; {office.jurisdiction}
                    </p>
                    <h3>{office.name}</h3>
                    <p>{office.responsibility}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    aria-pressed={isReviewed}
                    onClick={() => toggleReviewed(office.id)}
                  >
                    {isReviewed ? (
                      <CheckCircle2 aria-hidden="true" />
                    ) : (
                      <Circle aria-hidden="true" />
                    )}
                    {isReviewed ? 'Reviewed' : 'Mark reviewed'}
                  </Button>
                </div>
                <ul className="candidate-name-list">
                  {candidates.map((candidate) => (
                    <li key={`${office.id}-${candidate.name}`}>
                      <div>
                        <strong>{candidate.name}</strong>
                        <span>
                          {candidate.district
                            ? `District ${candidate.district}; `
                            : ''}
                          {candidate.party}
                        </span>
                      </div>
                      <span
                        className={
                          candidate.statementAvailable
                            ? 'statement-available'
                            : 'statement-unavailable'
                        }
                      >
                        {candidate.statementAvailable
                          ? 'Statement published'
                          : 'No statement published'}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="candidate-office-actions">
                  <a
                    href={office.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => recordOfficialSource(office.id)}
                  >
                    Read the official candidate page{' '}
                    <ExternalLink aria-hidden="true" />
                  </a>
                  {office.id === 'board-of-equalization' && (
                    <a
                      href="https://voterguide.sos.ca.gov/voter-info/boe-districts.htm"
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => recordOfficialSource(office.id)}
                    >
                      Check the official district map{' '}
                      <ExternalLink aria-hidden="true" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="candidate-empty">
          <strong>No candidates or offices match that search.</strong>
          <p>
            Try governor, insurance, education, a candidate name or a party.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setQuery('');
              setCategory('All');
            }}
          >
            Show every office
          </Button>
        </div>
      )}

      <div className="candidate-guide-cta">
        <p>
          Candidate statements are supplied by candidates and are not checked
          for accuracy by the state; a missing statement does not mean a
          candidate is missing from the ballot.
        </p>
        <a
          href="#newsletter"
          onClick={() =>
            recordOnce(
              'candidate_newsletter_selected',
              'Candidate Newsletter Selected',
            )
          }
        >
          Get the Journal briefing
        </a>
      </div>

      <nav
        className="candidate-related-guides"
        aria-label="Related election guides"
      >
        <Link
          href="/california-propositions-2026"
          onClick={() =>
            record(
              'candidate_proposition_guide_selected',
              'Candidate Proposition Guide Selected',
            )
          }
        >
          Review all 14 propositions
        </Link>
        <Link
          href="/california-deadlines"
          onClick={() =>
            record(
              'candidate_deadline_guide_selected',
              'Candidate Deadline Guide Selected',
            )
          }
        >
          Check election deadlines
        </Link>
      </nav>
    </section>
  );
}
