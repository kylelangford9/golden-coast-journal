'use client';

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * A horizontal deck of story cards: one card per swipe on a phone, arrows and
 * keyboard on a pointer device.
 *
 * Scroll snapping does the work, so the swipe is the browser's own inertial
 * scroll rather than a re-implementation of it in pointer handlers. That keeps
 * momentum, rubber-banding and accessibility behaving the way the platform
 * already does, and it still reads as a deck.
 */
export function StoryDeck({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const slides = Children.toArray(children).filter(isValidElement);
  const [active, setActive] = useState(0);

  const step = useCallback((direction: -1 | 1) => {
    const node = track.current;
    if (!node) return;
    const first = node.firstElementChild as HTMLElement | null;
    const width = first
      ? first.getBoundingClientRect().width + 18
      : node.clientWidth;
    node.scrollBy({
      left: direction * width,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, []);

  useEffect(() => {
    const node = track.current;
    if (!node) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const first = node.firstElementChild as HTMLElement | null;
        const width = first
          ? first.getBoundingClientRect().width + 18
          : node.clientWidth;
        if (width > 0)
          setActive(Math.round(node.scrollLeft / width));
      });
    };
    node.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      node.removeEventListener('scroll', onScroll);
    };
  }, []);

  if (!slides.length) return null;

  return (
    <div
      className="story-deck"
      aria-roledescription="carousel"
      aria-label={label}
    >
      {/* The track carries no tabIndex or key handler of its own. Each card
          holds a link, so tabbing already walks the deck and the browser
          scrolls the next card into view; the arrow buttons below cover the
          same ground for anyone who would rather click. Adding a focusable
          wrapper on top of that only creates a second, emptier tab stop. */}
      <div ref={track} className="deck-track">
        {slides.map((slide, index) => (
          <div
            className="deck-slide"
            key={index}
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${slides.length}`}
          >
            {slide}
          </div>
        ))}
      </div>

      <div className="deck-controls">
        <button
          type="button"
          className="deck-arrow"
          aria-label="Previous story"
          disabled={active <= 0}
          onClick={() => step(-1)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <p className="deck-count" aria-live="polite">
          {Math.min(active + 1, slides.length)} / {slides.length}
        </p>
        <button
          type="button"
          className="deck-arrow"
          aria-label="Next story"
          disabled={active >= slides.length - 1}
          onClick={() => step(1)}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
