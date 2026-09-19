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

const AUTO_ADVANCE_MS = 60_000;
const FLY_DISTANCE = 520;
const THROW_THRESHOLD = 70;

/**
 * A deck of story cards, one per card, dealt like a hand.
 *
 * Built on the ballot matchup deck from kylelangford.org: the cards underneath
 * are blank slabs rather than real cards, because rendering the full card
 * behind lets its text hang out below the top one and collide with the
 * controls. A slab's corner is all that is needed to show there is a stack,
 * and it cannot overflow because it holds nothing.
 *
 * The top card is the only one in flow, so the deck is exactly as tall as the
 * card actually on top.
 */
export function StoryDeck({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const slides = Children.toArray(children).filter(isValidElement);
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [flying, setFlying] = useState<0 | 1 | -1>(0);
  const [reduced, setReduced] = useState(false);
  // Dragging is the only thing that reads this during a gesture, so it lives in
  // state rather than a ref the render would have to peek at.
  const [dragging, setDragging] = useState(false);
  const grab = useRef<{ x: number } | null>(null);
  const paused = useRef(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    onChange();
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const go = useCallback(
    (direction: 1 | -1) => {
      if (slides.length < 2) return;
      setFlying(direction);
      window.setTimeout(
        () => {
          setIndex((current) => (current + (direction === 1 ? 1 : slides.length - 1)) % slides.length);
          setDrag(0);
          setFlying(0);
        },
        reduced ? 0 : 180,
      );
    },
    [reduced, slides.length],
  );

  // Deals itself a new card every minute, so a desk left open keeps moving.
  // Pauses while a finger is down so it never snatches a card mid-drag.
  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => {
      if (!paused.current) go(1);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [go, slides.length]);

  if (!slides.length) return null;

  const offset = flying === 0 ? drag : flying * FLY_DISTANCE;

  return (
    <div className="story-deck" aria-roledescription="carousel" aria-label={label}>
      <div className="deck">
        {[2, 1].map((depth) => (
          <div
            key={`slab-${depth}`}
            aria-hidden="true"
            className="deck-card is-under"
            style={{
              transform: `translate(${depth * 9}px, ${depth * 9}px) scale(${1 - depth * 0.028})`,
            }}
          />
        ))}

        <div
          className="deck-card is-top"
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${slides.length}`}
          style={{
            transform: `translateX(${offset}px) rotate(${offset / 28}deg)`,
            transition: dragging && flying === 0 ? 'none' : `transform ${reduced ? 0 : 180}ms ease-out`,
            opacity: flying !== 0 ? 0 : 1,
          }}
          onPointerDown={(event) => {
            if (slides.length < 2) return;
            event.currentTarget.setPointerCapture?.(event.pointerId);
            grab.current = { x: event.clientX };
            paused.current = true;
            setDragging(true);
          }}
          onPointerMove={(event) => {
            if (!grab.current) return;
            setDrag(event.clientX - grab.current.x);
          }}
          onPointerUp={() => {
            const thrown = Math.abs(drag) > THROW_THRESHOLD;
            grab.current = null;
            paused.current = false;
            setDragging(false);
            if (thrown) go(drag < 0 ? 1 : -1);
            else setDrag(0);
          }}
          onPointerCancel={() => {
            grab.current = null;
            paused.current = false;
            setDragging(false);
            setDrag(0);
          }}
        >
          {slides[index]}
        </div>
      </div>

      <div className="deck-controls">
        <button
          type="button"
          className="deck-arrow"
          aria-label="Previous story"
          onClick={() => go(-1)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <p className="deck-count" aria-live="polite">
          {index + 1}/{slides.length}
        </p>
        <button
          type="button"
          className="deck-arrow"
          aria-label="Next story"
          onClick={() => go(1)}
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
