'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { track } from '@vercel/analytics/react';
import { Button } from '@/components/ui/button';
import { trackPortfolioGrowth } from '@/lib/growth-client';

export type BriefingPreviewStory = {
  slug: string;
  section: string;
  title: string;
  dek: string;
  readingMinutes: number;
};

type BriefingPreviewBuilderProps = {
  sections: string[];
  stories: BriefingPreviewStory[];
};

function trackOnce(eventName: string, analyticsName: string) {
  const key = `gcj_${eventName}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
  } catch {
    // Analytics is non-essential; the builder remains fully usable.
  }
  const metadata = { surface: 'briefing_preview' };
  track(analyticsName, metadata);
  trackPortfolioGrowth(eventName, metadata);
}

export function BriefingPreviewBuilder({
  sections,
  stories,
}: BriefingPreviewBuilderProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [built, setBuilt] = useState(false);

  const preview = useMemo(() => {
    if (!built) return [];
    const selectedStories = stories.filter((story) =>
      selected.includes(story.section),
    );
    const otherStories = stories.filter(
      (story) => !selected.includes(story.section),
    );
    return [...selectedStories, ...otherStories].slice(0, 3);
  }, [built, selected, stories]);

  function toggleSection(section: string) {
    trackOnce('briefing_preview_started', 'Briefing Preview Started');
    setSelected((current) =>
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section],
    );
    setBuilt(false);
  }

  function buildPreview() {
    if (!selected.length) return;
    setBuilt(true);
    trackOnce('briefing_preview_built', 'Briefing Preview Built');
  }

  return (
    <section className="briefing-builder" aria-labelledby="briefing-builder-title">
      <div className="briefing-builder-controls">
        <p className="eyebrow">Step 1</p>
        <h2 id="briefing-builder-title">Choose the desks you read.</h2>
        <p>
          Select one or more sections. Your choices stay in this browser tab and
          are never saved or sent to the Journal.
        </p>
        <div className="briefing-topic-grid" aria-label="Briefing sections">
          {sections.map((section) => {
            const isSelected = selected.includes(section);
            return (
              <Button
                key={section}
                type="button"
                variant="outline"
                aria-pressed={isSelected}
                className="briefing-topic"
                onClick={() => toggleSection(section)}
              >
                {isSelected && <Check aria-hidden="true" />}
                {section}
              </Button>
            );
          })}
        </div>
        <Button
          type="button"
          className="briefing-build-button"
          disabled={!selected.length}
          onClick={buildPreview}
        >
          Build today’s preview <ArrowRight aria-hidden="true" />
        </Button>
      </div>

      <div className="briefing-preview" aria-live="polite">
        <p className="eyebrow">Step 2</p>
        {!built ? (
          <div className="briefing-preview-empty">
            <span>01</span>
            <h2>Your briefing will appear here.</h2>
            <p>
              It will draw from reporting already published by the Journal—no
              generated summaries and no hidden recommendation profile.
            </p>
          </div>
        ) : (
          <>
            <h2>Your briefing preview</h2>
            <ol className="briefing-preview-list">
              {preview.map((story, index) => (
                <li key={story.slug}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="eyebrow">{story.section}</p>
                    <h3>
                      <Link href={`/article/${story.slug}`}>{story.title}</Link>
                    </h3>
                    <p>{story.dek}</p>
                    <small>{story.readingMinutes} min read</small>
                  </div>
                </li>
              ))}
            </ol>
            <a
              className="briefing-signup-link"
              href="#briefing-newsletter"
              onClick={() =>
                trackOnce(
                  'briefing_signup_selected',
                  'Briefing Signup Selected',
                )
              }
            >
              Get future Journal briefings <ArrowRight aria-hidden="true" />
            </a>
          </>
        )}
      </div>
    </section>
  );
}
