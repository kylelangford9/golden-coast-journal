'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  MapPinned,
  Users,
} from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { trackPortfolioGrowth } from '@/lib/growth-client';

const electionPaths = [
  {
    id: 'statewide_candidates',
    eyebrow: 'Statewide offices',
    title: 'Compare the candidates',
    description:
      'Search 24 names across nine office sections; see what each office controls and open the official statements.',
    href: '/california-candidates-2026',
    action: 'Open candidate guide',
    icon: Users,
  },
  {
    id: 'statewide_propositions',
    eyebrow: 'Statewide measures',
    title: 'Read all 14 propositions',
    description:
      'Check what yes and no mean, review the fiscal effects and keep the state analysis attached.',
    href: '/california-propositions-2026',
    action: 'Open proposition guide',
    icon: FileText,
  },
  {
    id: 'election_deadlines',
    eyebrow: 'Dates and actions',
    title: 'Put the deadlines in order',
    description:
      'Track registration, ballot mailing, early voting and Election Day; download the working calendar.',
    href: '/california-deadlines',
    action: 'Open deadline tracker',
    icon: CalendarDays,
  },
  {
    id: 'personalized_ballot',
    eyebrow: 'Your district and county',
    title: 'Find the ballot tied to you',
    description:
      'Move to California Voters for an address-based ballot lookup; the Journal does not receive your address.',
    href: 'https://californiavoters.live/?utm_source=golden_coast_journal&utm_medium=referral&utm_campaign=california_election_hub_2026&utm_content=personalized_ballot',
    action: 'Find my district ballot',
    icon: MapPinned,
    external: true,
  },
] as const;

const officialSources = [
  {
    id: 'official_voter_guide',
    label: 'Official California voter guide',
    href: 'https://voterguide.sos.ca.gov/',
  },
  {
    id: 'my_voter_status',
    label: 'Check My Voter Status',
    href: 'https://voterstatus.sos.ca.gov/',
  },
  {
    id: 'county_election_offices',
    label: 'Find a county elections office',
    href: 'https://www.sos.ca.gov/elections/voting-resources/county-elections-offices',
  },
] as const;

function record(
  eventName:
    | 'election_hub_opened'
    | 'election_hub_path_selected'
    | 'election_hub_official_source_opened'
    | 'election_hub_ballot_tool_selected',
  metadata: Record<string, string>,
) {
  const analyticsNames = {
    election_hub_opened: 'Election Hub Opened',
    election_hub_path_selected: 'Election Hub Path Selected',
    election_hub_official_source_opened: 'Election Hub Official Source Opened',
    election_hub_ballot_tool_selected: 'Election Hub Ballot Tool Selected',
  } as const;
  track(analyticsNames[eventName], metadata);
  trackPortfolioGrowth(eventName, metadata);
}

export function ElectionHub() {
  useEffect(() => {
    const key = 'gcj_election_hub_opened_2026';
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    } catch {
      // Continue with one in-memory mount event when storage is unavailable.
    }
    record('election_hub_opened', { surface: 'california_election_2026' });
  }, []);

  function selectPath(id: string, external: boolean) {
    const metadata = {
      surface: 'california_election_2026',
      destination: id,
    };
    record('election_hub_path_selected', metadata);
    if (external && id === 'personalized_ballot') {
      record('election_hub_ballot_tool_selected', metadata);
    }
  }

  return (
    <>
      <section
        className="election-paths"
        aria-labelledby="election-paths-title"
      >
        <div className="election-section-heading">
          <div>
            <p className="eyebrow">Start with the question in front of you</p>
            <h2 id="election-paths-title">Four paths; one election.</h2>
          </div>
          <p>
            Statewide offices and propositions appear across California; district,
            legislative, congressional, judicial and local contests depend on the
            voter&apos;s address.
          </p>
        </div>
        <div className="election-path-grid">
          {electionPaths.map((item, index) => {
            const Icon = item.icon;
            const content = (
              <>
                <div className="election-path-number">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <Icon aria-hidden="true" />
                </div>
                <p className="eyebrow">{item.eyebrow}</p>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <strong>
                  {item.action}{' '}
                  {'external' in item ? (
                    <ExternalLink aria-hidden="true" />
                  ) : (
                    <ArrowRight aria-hidden="true" />
                  )}
                </strong>
              </>
            );
            return 'external' in item ? (
              <a
                key={item.id}
                className="election-path-card"
                href={item.href}
                target="_blank"
                rel="noreferrer"
                onClick={() => selectPath(item.id, true)}
              >
                {content}
              </a>
            ) : (
              <Link
                key={item.id}
                className="election-path-card"
                href={item.href}
                onClick={() => selectPath(item.id, false)}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="election-source-strip" aria-label="Official election sources">
        <div>
          <CheckCircle2 aria-hidden="true" />
          <p>
            <strong>Go straight to the record;</strong> these links leave the Journal
            for official California election systems.
          </p>
        </div>
        <nav aria-label="Official California election resources">
          {officialSources.map((source) => (
            <a
              key={source.id}
              href={source.href}
              target="_blank"
              rel="noreferrer"
              onClick={() =>
                record('election_hub_official_source_opened', {
                  surface: 'california_election_2026',
                  destination: source.id,
                })
              }
            >
              {source.label} <ExternalLink aria-hidden="true" />
            </a>
          ))}
        </nav>
      </section>
    </>
  );
}

export function ElectionHubLink({
  placement,
  className,
  children = 'Open the complete election guide',
}: {
  placement: 'homepage';
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href="/california-election-2026"
      className={className}
      onClick={() =>
        record('election_hub_path_selected', {
          surface: placement,
          destination: 'california_election_2026',
        })
      }
    >
      {children} <ArrowRight aria-hidden="true" />
    </Link>
  );
}
