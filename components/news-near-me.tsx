'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  LoaderCircle,
  LocateFixed,
  MapPin,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import { track } from '@vercel/analytics/react';
import {
  chooseLabels,
  edgePoint,
  groupStories,
  placePages,
  type Box,
  type Group,
  type Offset,
} from '@/lib/paper-layout';

type NearCard = {
  slug: string;
  title: string;
  section: string;
  imageUrl: string;
  dek: string;
  where: string;
};

type Rect = { x: number; y: number; w: number; h: number };

type LayerName =
  | 'land'
  | 'urban'
  | 'forests'
  | 'parks'
  | 'airports'
  | 'water'
  | 'rivers'
  | 'borders'
  | 'states'
  | 'counties'
  | 'arterials'
  | 'highways'
  | 'motorways';

type Geometry = {
  bounds: Rect;
  tolerance: number;
  layers: Record<LayerName, string>;
  highlight: string;
  /** [name, x, y, rank, kind], in the order to place them. */
  labels: [string, number, number, number, number][];
  /** Shaded relief tiles: [key, x, y, w, h]. */
  relief: [string, number, number, number, number][];
  /** The relief images this answer carries: those the browser did not have. */
  images: Record<string, string>;
};

// What each kind of name is called in the stylesheet, as lib/near-me-map.ts
// numbers them.
const NAME_CLASS = ['town', 'ocean', 'water', 'park', 'state', 'country'];

type MapStory = {
  x: number;
  y: number;
  place: string;
  distance: string | null;
  near: boolean;
  story: NearCard;
};

type NearResult = {
  town: string;
  radius: string;
  hasNear: boolean;
  projection: { lon0: number; cos: number };
  view: Rect;
  you: { x: number; y: number };
  ring: number;
  highlight: string[];
  geometry: Geometry;
  stories: MapStory[];
  more: { heading: string; stories: NearCard[] }[];
  credit: string;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'locating' }
  | { kind: 'loading' }
  | { kind: 'ready'; result: NearResult }
  | { kind: 'error'; message: string };

const MESSAGES = {
  unsupported: 'This browser cannot share a location.',
  denied:
    'Location is turned off for the Journal. Allow it in your browser’s settings, then try again.',
  unavailable: 'Your location could not be found. Try again in a moment.',
  failed: 'The stories near you could not be loaded. Try again in a moment.',
} as const;

// Two decimal places is about a kilometer: enough to name the town, and no
// closer than that leaves the reader's device.
const round = (value: number) => Math.round(value * 100) / 100;

const PHONE = '(max-width: 760px)';

/**
 * News near Me. Nothing is asked for until the reader taps the button; the
 * browser then asks their permission, and the rounded position goes to the
 * Journal's own server once, which names the nearest town, places every story
 * it can and draws the map they sit on.
 */
export function NewsNearMe() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const titleId = useId();
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);

  // The panel takes the button's place, so focus goes to its heading when it
  // opens and back to the button when it closes; a keyboard or screen-reader
  // user is never left on an element that has gone.
  useEffect(() => {
    if (status.kind === 'ready') heading.current?.focus();
    if (status.kind === 'idle' && closing.current) {
      closing.current = false;
      button.current?.focus();
    }
  }, [status.kind]);

  function fail(reason: keyof typeof MESSAGES) {
    setStatus({ kind: 'error', message: MESSAGES[reason] });
    track('News Near Me', { outcome: reason });
  }

  async function load(lat: number, lon: number) {
    setStatus({ kind: 'loading' });
    // The map is a box in the page, 4:3 on a phone and 16:9 beside the
    // stories on a desk, and opens full screen when asked; the server draws
    // it for the width it will have.
    const phone = window.matchMedia(PHONE).matches;
    const shell = root.current?.clientWidth || 360;
    const pixels = Math.round(phone ? shell - 34 : ((shell - 74) * 1.5) / 2.5);
    const aspect = phone ? 4 / 3 : 16 / 9;
    try {
      const response = await fetch('/api/near-me', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          lat: round(lat),
          lon: round(lon),
          aspect,
          pixels,
        }),
      });
      if (!response.ok) throw new Error(`near-me returned ${response.status}`);
      const result = (await response.json()) as NearResult;
      setStatus({ kind: 'ready', result });
      track('News Near Me', { outcome: result.hasNear ? 'near' : 'none_near' });
    } catch {
      fail('failed');
    }
  }

  function locate() {
    if (!('geolocation' in navigator)) {
      fail('unsupported');
      return;
    }
    setStatus({ kind: 'locating' });
    navigator.geolocation.getCurrentPosition(
      (position) => load(position.coords.latitude, position.coords.longitude),
      (error) => fail(error.code === 1 ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 },
    );
  }

  const busy = status.kind === 'locating' || status.kind === 'loading';

  return (
    <div className="near-me" ref={root}>
      {status.kind === 'ready' ? null : (
        <div className="near-me-bar">
          <button
            ref={button}
            type="button"
            className="near-me-button"
            onClick={locate}
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle className="near-me-spinner" size={15} aria-hidden="true" />
            ) : (
              <MapPin size={15} aria-hidden="true" />
            )}
            {status.kind === 'locating'
              ? 'Finding your location…'
              : status.kind === 'loading'
                ? 'Finding stories…'
                : 'News near Me'}
          </button>
          <output className="near-me-message">
            {status.kind === 'error' ? status.message : ''}
          </output>
        </div>
      )}

      {status.kind === 'ready' ? (
        <section className="near-me-panel" aria-labelledby={titleId}>
          <header className="near-me-head">
            <div>
              <p className="eyebrow">News near me</p>
              <h2 id={titleId} ref={heading} tabIndex={-1}>
                Showing stories near {status.result.town}
              </h2>
            </div>
            <button
              type="button"
              className="near-me-close"
              onClick={() => {
                closing.current = true;
                setStatus({ kind: 'idle' });
              }}
              aria-label="Close stories near you"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          {status.result.hasNear ? null : (
            <p className="near-me-empty">
              Nothing the Journal has published is set within {status.result.radius} of{' '}
              {status.result.town} yet; the map opens on the closest.
            </p>
          )}

          <NearMap result={status.result} />

          {status.result.more.map((group) => (
            <details className="near-me-more" key={group.heading}>
              <summary>
                {group.heading} <span>({group.stories.length})</span>
              </summary>
              <ul>
                {group.stories.map((story) => (
                  <li key={story.slug}>
                    <StoryLink story={story} group="more" compact />
                  </li>
                ))}
              </ul>
            </details>
          ))}

          <p className="near-me-note">
            Your location was rounded to about a kilometer and used once to find
            these stories. The map is drawn by the Journal, not a mapping service;
            moving it sends only the area on screen, which is not stored.{' '}
            {status.result.credit}
          </p>
        </section>
      ) : null}
    </div>
  );
}

const MAX_PAGES = 7;
// The zoom buttons' corner, which pages, names and the reader's dot keep out of.
const CONTROLS = { w: 58, h: 180 };
// The scale bar's corner, bottom left.
const SCALE = { w: 132, h: 30 };
const MIN_WIDTH = 30; // world units across at the closest zoom: about two miles
const TAP_SLOP = 6;

type Size = { w: number; h: number };

type Gesture =
  | {
      kind: 'pan';
      start: Rect;
      x: number;
      y: number;
      moved: boolean;
      samples: { t: number; x: number; y: number }[];
    }
  | { kind: 'pinch'; start: Rect; distance: number; mid: { x: number; y: number } };

const inside = (inner: Rect, outer: Rect) =>
  inner.x >= outer.x &&
  inner.y >= outer.y &&
  inner.x + inner.w <= outer.x + outer.w &&
  inner.y + inner.h <= outer.y + outer.h;

/**
 * The map. It moves like a map app: drag it, with momentum when let go;
 * pinch, double-tap or use the buttons to zoom; the arrow keys and + and −
 * work once it has focus. Every story the Journal can place is on it, as a
 * mini front page where there is room and a numbered bubble where there is
 * not; tapping a bubble zooms in on it.
 */
function NearMap({ result }: { result: NearResult }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  const [view, setViewState] = useState<Rect>(result.view);
  // The view as gestures see it between renders; drawing reads the state.
  const viewNow = useRef<Rect>(result.view);
  const [geometry, setGeometry] = useState<Geometry>(result.geometry);
  const geometryNow = useRef<Geometry>(result.geometry);
  // Relief images by tile, kept as the map moves, so each is sent only once.
  const [reliefImages] = useState(() => new Map(Object.entries(result.geometry.images || {})));
  const [layout, setLayout] = useState<{ groups: Group[]; pages: Map<string, Offset> }>({
    groups: [],
    pages: new Map(),
  });
  const pagesNow = useRef<Map<string, Offset>>(new Map());
  const [selected, setSelected] = useState<string[] | null>(null);
  const fetching = useRef<AbortController | null>(null);
  const motion = useRef(0);
  const lastDrag = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const lastTap = useRef<{ t: number; x: number; y: number } | null>(null);
  const nudged = useRef(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      root.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  const maxWidth = 360 * result.projection.cos * 1000;
  const page = size ? Math.round(Math.min(128, Math.max(92, size.w * 0.27))) : 100;

  // The view keeps the map's shape and stays between two miles and the world.
  const setView = useCallback(
    (next: Rect) => {
      const el = box.current;
      const aspect = el ? el.clientWidth / Math.max(1, el.clientHeight) : next.w / next.h;
      const w = Math.min(maxWidth, Math.max(MIN_WIDTH, next.w));
      const h = w / aspect;
      const cx = next.x + next.w / 2;
      const cy = Math.min(85000, Math.max(-85000, next.y + next.h / 2));
      const clamped = { x: cx - w / 2, y: cy - h / 2, w, h };
      viewNow.current = clamped;
      setViewState(clamped);
    },
    [maxWidth],
  );

  const slugsOf = useCallback(
    (group: Group) => group.members.map((index) => result.stories[index].story.slug),
    [result],
  );

  // What is shown settles after every move: the pages are laid out again for
  // what is in view, and more of the map is asked for if the view has moved
  // past what was drawn or zoomed far from its detail.
  const settle = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    let v = viewNow.current;
    let scale = w / v.w;
    // The first view never opens with the reader under the zoom buttons.
    if (!nudged.current) {
      nudged.current = true;
      const x = (result.you.x - v.x) * scale;
      const y = (result.you.y - v.y) * scale;
      if (x > w - CONTROLS.w - 24 && y < CONTROLS.h + 24) {
        v = { ...v, x: v.x + (x - (w - CONTROLS.w - 40)) / scale };
        setView(v);
        v = viewNow.current;
        scale = w / v.w;
      }
    }
    const visible: number[] = [];
    const points: { x: number; y: number }[] = [];
    result.stories.forEach((item, index) => {
      const x = (item.x - v.x) * scale;
      const y = (item.y - v.y) * scale;
      if (x > -20 && y > -20 && x < w + 20 && y < h + 20) {
        visible.push(index);
        points.push({ x, y });
      }
    });
    const groups = groupStories(
      visible.map((index) => result.stories[index].story.slug),
      points,
      page * 0.28,
    ).map((group) => ({ ...group, members: group.members.map((m) => visible[m]) }));
    const you = { x: (result.you.x - v.x) * scale, y: (result.you.y - v.y) * scale };
    const pages = placePages(
      groups,
      [
        { x: you.x - 16, y: you.y - 16, w: 32, h: 32 },
        { x: w - CONTROLS.w, y: 0, w: CONTROLS.w, h: CONTROLS.h },
        { x: 0, y: h - SCALE.h, w: SCALE.w, h: SCALE.h },
      ],
      w,
      h,
      { w: page, h: page },
      MAX_PAGES,
      pagesNow.current,
    );
    pagesNow.current = pages;
    setLayout({ groups, pages });
    setSelected((current) => current ?? (groups[0] ? slugsOf(groups[0]) : null));

    const tolerance = (v.w / w) * 0.8;
    const drawn = geometryNow.current;
    const detailed = drawn.tolerance <= tolerance * 1.8 && drawn.tolerance >= tolerance / 3;
    if (inside(v, drawn.bounds) && detailed) return;
    fetching.current?.abort();
    const controller = new AbortController();
    fetching.current = controller;
    fetch('/api/near-me/map', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        projection: result.projection,
        bounds: { x: v.x - v.w / 2, y: v.y - v.h / 2, w: v.w * 2, h: v.h * 2 },
        tolerance,
        highlight: result.highlight,
        have: [...reliefImages.keys()],
      }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((next: Geometry | null) => {
        if (next && fetching.current === controller) {
          for (const [key, image] of Object.entries(next.images || {})) reliefImages.set(key, image);
          // A few hundred tiles at most: the oldest out of view go first.
          if (reliefImages.size > 400) {
            const inUse = new Set(next.relief.map(([key]) => key));
            for (const key of reliefImages.keys()) {
              if (reliefImages.size <= 300) break;
              if (!inUse.has(key)) reliefImages.delete(key);
            }
          }
          geometryNow.current = next;
          setGeometry(next);
        }
      })
      .catch(() => {});
  }, [page, reliefImages, result, setView, slugsOf]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      setView(viewNow.current);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [setView]);

  // Laid out once the map has its size, again if it changes, and otherwise
  // at the end of each move.
  useEffect(() => {
    if (size) settle();
  }, [size, settle]);

  const [flight, setFlight] = useState<{ to: Rect } | null>(null);

  const stopMotion = useCallback(() => {
    if (motion.current) cancelAnimationFrame(motion.current);
    motion.current = 0;
    setFlight(null);
  }, []);

  /** Eases the view to `target` over a quarter of a second, like a map app's zoom. */
  const animateTo = useCallback(
    (target: Rect) => {
      stopMotion();
      setFlight({ to: target });
    },
    [stopMotion],
  );

  useEffect(() => {
    if (!flight) return;
    const from = { ...viewNow.current };
    const target = flight.to;
    let frame = 0;
    let start = 0;
    const step = (now: number) => {
      start ||= now;
      const t = Math.min(1, (now - start) / 260);
      const e = 1 - (1 - t) ** 3;
      setView({
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        w: from.w + (target.w - from.w) * e,
        h: from.h + (target.h - from.h) * e,
      });
      if (t < 1) frame = requestAnimationFrame(step);
      else {
        setFlight(null);
        settle();
      }
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [flight, setView, settle]);

  /** Zooms by `factor` keeping the point at (px, py) on screen where it is. */
  const zoomTarget = useCallback(
    (factor: number, px?: number, py?: number): Rect => {
      const el = box.current;
      const v = viewNow.current;
      if (!el) return v;
      const fx = (px ?? el.clientWidth / 2) / el.clientWidth;
      const fy = (py ?? el.clientHeight / 2) / el.clientHeight;
      const w = Math.min(maxWidth, Math.max(MIN_WIDTH, v.w / factor));
      const h = (w * v.h) / v.w;
      return { x: v.x + fx * v.w - fx * w, y: v.y + fy * v.h - fy * h, w, h };
    },
    [maxWidth],
  );

  const local = (e: { clientX: number; clientY: number }) => {
    const rect = box.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const beginPan = (at: { x: number; y: number }) => {
    gesture.current = {
      kind: 'pan',
      start: { ...viewNow.current },
      x: at.x,
      y: at.y,
      moved: false,
      samples: [],
    };
  };

  // Gestures. One pointer pans, two pinch; a pan let go keeps moving and
  // slows, as a flicked map does.
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    stopMotion();
    const at = local(e);
    pointers.current.set(e.pointerId, at);
    if (pointers.current.size === 1) beginPan(at);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        kind: 'pinch',
        start: { ...viewNow.current },
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
      box.current?.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const at = local(e);
    pointers.current.set(e.pointerId, at);
    const g = gesture.current;
    const el = box.current!;
    if (g?.kind === 'pan') {
      const dx = at.x - g.x;
      const dy = at.y - g.y;
      if (!g.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
      if (!g.moved) {
        g.moved = true;
        el.setPointerCapture(e.pointerId);
      }
      const scale = g.start.w / el.clientWidth;
      setView({ ...g.start, x: g.start.x - dx * scale, y: g.start.y - dy * scale });
      g.samples.push({ t: e.timeStamp, x: at.x, y: at.y });
      if (g.samples.length > 6) g.samples.shift();
    } else if (g?.kind === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const w = Math.min(maxWidth, Math.max(MIN_WIDTH, (g.start.w * g.distance) / distance));
      const h = (w * g.start.h) / g.start.w;
      // The point that was under the fingers stays under them.
      const wx = g.start.x + (g.mid.x / el.clientWidth) * g.start.w;
      const wy = g.start.y + (g.mid.y / el.clientHeight) * g.start.h;
      setView({
        x: wx - (mid.x / el.clientWidth) * w,
        y: wy - (mid.y / el.clientHeight) * h,
        w,
        h,
      });
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    const el = box.current!;
    if (g?.kind === 'pinch') {
      lastDrag.current = e.timeStamp;
      if (pointers.current.size === 1) beginPan([...pointers.current.values()][0]);
      else {
        gesture.current = null;
        settle();
      }
      return;
    }
    gesture.current = null;
    if (g?.kind !== 'pan') return;
    const at = local(e);
    if (!g.moved) {
      // A tap. Two in quick succession zoom in there, as on a phone's map
      // or with a mouse's double-click.
      const previous = lastTap.current;
      const now = e.timeStamp;
      if (previous && now - previous.t < 320 && Math.hypot(previous.x - at.x, previous.y - at.y) < 30) {
        lastTap.current = null;
        animateTo(zoomTarget(2, at.x, at.y));
      } else {
        lastTap.current = { t: now, x: at.x, y: at.y };
      }
      return;
    }
    lastDrag.current = e.timeStamp;
    const first = g.samples[0];
    const last = g.samples[g.samples.length - 1];
    const dt = last && first ? last.t - first.t : 0;
    let vx = dt > 0 ? (last.x - first.x) / dt : 0;
    let vy = dt > 0 ? (last.y - first.y) / dt : 0;
    if (e.timeStamp - (last?.t ?? 0) > 80) {
      vx = 0;
      vy = 0;
    }
    let previousTime = performance.now();
    const glide = (now: number) => {
      const elapsed = now - previousTime;
      previousTime = now;
      const decay = 0.94 ** (elapsed / 16);
      vx *= decay;
      vy *= decay;
      const current = viewNow.current;
      const scale = current.w / el.clientWidth;
      setView({
        ...current,
        x: current.x - vx * elapsed * scale,
        y: current.y - vy * elapsed * scale,
      });
      if (Math.hypot(vx, vy) > 0.02) motion.current = requestAnimationFrame(glide);
      else {
        motion.current = 0;
        settle();
      }
    };
    if (Math.hypot(vx, vy) > 0.05) motion.current = requestAnimationFrame(glide);
    else settle();
  };

  // A trackpad pinch arrives as a wheel with Ctrl held; a plain wheel still
  // scrolls the page, so the map never traps a reader scrolling past it.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let timer = 0;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      stopMotion();
      const rect = el.getBoundingClientRect();
      setView(
        zoomTarget(Math.exp(-e.deltaY * 0.01), e.clientX - rect.left, e.clientY - rect.top),
      );
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 140);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      window.clearTimeout(timer);
    };
  }, [setView, settle, stopMotion, zoomTarget]);

  // The arrow keys move the map, and + and − zoom it, from any of its buttons.
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const v = viewNow.current;
    const pan = (fx: number, fy: number) =>
      animateTo({ ...v, x: v.x + v.w * fx, y: v.y + v.h * fy });
    if (e.key === 'ArrowLeft') pan(-0.2, 0);
    else if (e.key === 'ArrowRight') pan(0.2, 0);
    else if (e.key === 'ArrowUp') pan(0, -0.2);
    else if (e.key === 'ArrowDown') pan(0, 0.2);
    else if (e.key === '+' || e.key === '=') animateTo(zoomTarget(2));
    // Enter and space still press the button.
    else if (e.key === '-' || e.key === '_') animateTo(zoomTarget(0.5));
    else return;
    e.preventDefault();
  };

  // A click that ends a drag is the end of the drag, not a choice.
  const recentlyDragged = (e: { timeStamp: number }) => e.timeStamp - lastDrag.current < 250;

  const scale = size ? size.w / view.w : 1;
  const toScreen = (x: number, y: number) => ({
    x: (x - view.x) * scale,
    y: (y - view.y) * scale,
  });
  const you = toScreen(result.you.x, result.you.y);
  const selectedSet = new Set(selected || []);
  const selectedStories = (selected || [])
    .map((slug) => result.stories.find((item) => item.story.slug === slug))
    .filter((item): item is MapStory => !!item);

  // Town names go where they clear everything else drawn over the map.
  const obstacles: Box[] = [{ x: you.x - 18, y: you.y - 18, w: 36, h: 36 }];
  if (size) {
    obstacles.push(
      { x: size.w - CONTROLS.w, y: 0, w: CONTROLS.w, h: CONTROLS.h },
      { x: 0, y: size.h - SCALE.h, w: SCALE.w, h: SCALE.h },
    );
  }
  for (const group of layout.groups) {
    const leader = result.stories[group.members[0]];
    const at = toScreen(leader.x, leader.y);
    const offset = layout.pages.get(group.id);
    obstacles.push(
      offset
        ? { x: at.x + offset.dx, y: at.y + offset.dy, w: page, h: page }
        : { x: at.x - 14, y: at.y - 14, w: 28, h: 28 },
    );
  }
  // A map names more places the more room it has: about one to every
  // hundred pixels square.
  const labels = size
    ? chooseLabels(
        geometry.labels.map(([name, x, y, population, kind]) => ({
          name,
          population,
          kind,
          ...toScreen(x, y),
        })),
        obstacles,
        size.w,
        size.h,
        Math.round(Math.min(28, Math.max(8, (size.w * size.h) / 9000))),
      )
    : [];
  const unitsPerPixel = size ? view.w / size.w : 1;
  const zoom =
    unitsPerPixel > 20 ? 'far' : unitsPerPixel > 5 ? 'region' : unitsPerPixel > 1.2 ? 'metro' : 'city';
  const scaleBar = size ? scaleFor(unitsPerPixel, result.radius.endsWith('kilometers')) : null;
  const layers = geometry.layers;

  const choose = (group: Group, e: { timeStamp: number }) => {
    if (recentlyDragged(e)) return;
    setSelected(slugsOf(group));
    track('News Near Me Page Selected', { stories: group.members.length });
  };

  return (
    <div className={`near-me-body${expanded ? ' is-expanded' : ''}`}>
      {expanded ? (
        <div className="near-me-sheet-bar">
          <strong>Stories near {result.town}</strong>
          <button type="button" onClick={() => setExpanded(false)}>
            Done
          </button>
        </div>
      ) : null}
      <div
        className="near-me-map"
        ref={box}
        aria-roledescription="map"
        aria-label={`Map of stories around ${result.town}. Drag to move; pinch, double-tap or use the buttons to zoom; the arrow keys move it from any of its buttons.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Drawn as a printed map is, bottom to top: the sea, the land and
            what covers it, the relief's shadows, water, borders, then roads,
            each cased so it reads over everything under it. Every shape
            carries its own fill, so the map is still a map without its
            stylesheet. */}
        <svg
          className={`near-me-drawing is-${zoom}`}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          aria-hidden="true"
        >
          <rect
            className="near-me-water"
            fill="#cfe0e8"
            x={view.x - view.w}
            y={view.y - view.h}
            width={view.w * 3}
            height={view.h * 3}
          />
          {layers.land ? <path className="near-me-coast" d={layers.land} fill="none" /> : null}
          <path className="near-me-land" d={layers.land} fill="#f5f0e6" />
          {layers.urban ? <path className="near-me-urban" d={layers.urban} fill="#ece5d7" /> : null}
          {layers.forests ? (
            <path className="near-me-forests" d={layers.forests} fill="#e4ecd7" />
          ) : null}
          {layers.parks ? <path className="near-me-parks" d={layers.parks} fill="#d9e7c8" /> : null}
          {layers.airports ? (
            <path className="near-me-airports" d={layers.airports} fill="#e5e1d9" />
          ) : null}
          <g className="near-me-relief">
            {geometry.relief.map(([key, x, y, w, h]) => {
              const href = reliefImages.get(key);
              return href ? (
                <image
                  key={key}
                  href={href}
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  preserveAspectRatio="none"
                />
              ) : null;
            })}
          </g>
          {layers.water ? <path className="near-me-lakes" d={layers.water} fill="#cfe0e8" /> : null}
          {layers.rivers ? <path className="near-me-rivers" d={layers.rivers} fill="none" /> : null}
          {geometry.highlight ? (
            <path className="near-me-highlight" d={geometry.highlight} fill="none" />
          ) : null}
          {layers.counties ? (
            <path className="near-me-counties" d={layers.counties} fill="none" />
          ) : null}
          {layers.states ? <path className="near-me-states" d={layers.states} fill="none" /> : null}
          {layers.borders ? (
            <>
              <path className="near-me-borders-halo" d={layers.borders} fill="none" />
              <path className="near-me-borders" d={layers.borders} fill="none" />
            </>
          ) : null}
          {ROADS.map((road) =>
            layers[road] ? (
              <path
                key={`${road}-casing`}
                className={`near-me-road-casing is-${road}`}
                d={layers[road]}
                fill="none"
              />
            ) : null,
          )}
          {ROADS.map((road) =>
            layers[road] ? (
              <path key={road} className={`near-me-road is-${road}`} d={layers[road]} fill="none" />
            ) : null,
          )}
          <circle
            className="near-me-ring"
            cx={result.you.x}
            cy={result.you.y}
            r={result.ring}
            fill="none"
          />
        </svg>

        {size ? (
          <svg className="near-me-leaders" viewBox={`0 0 ${size.w} ${size.h}`} aria-hidden="true">
            {layout.groups.map((group) => {
              const offset = layout.pages.get(group.id);
              if (!offset) return null;
              const leader = result.stories[group.members[0]];
              const at = toScreen(leader.x, leader.y);
              const edge = edgePoint(
                { x: at.x + offset.dx, y: at.y + offset.dy, w: page, h: page },
                at,
              );
              return (
                <g key={group.id}>
                  <line x1={at.x} y1={at.y} x2={edge.x} y2={edge.y} />
                  <circle cx={at.x} cy={at.y} r={4.5} />
                </g>
              );
            })}
          </svg>
        ) : null}

        {labels.map((label) => {
          const kind = NAME_CLASS[label.kind ?? 0] ?? 'town';
          const major = kind === 'town' && label.population >= 1_000_000;
          return (
            <span key={`${label.name}|${Math.round(label.x)}|${Math.round(label.y)}`}>
              {kind === 'town' ? (
                <span
                  className={`near-me-town${major ? ' is-major' : ''}`}
                  style={{ transform: `translate(${label.x}px, ${label.y}px)` }}
                  aria-hidden="true"
                />
              ) : null}
              <span
                className={`near-me-label is-${kind}${major ? ' is-major' : ''}`}
                style={{
                  transform: `translate(${label.box.x}px, ${label.box.y}px)`,
                  width: label.box.w,
                  textAlign: label.align,
                }}
                aria-hidden="true"
              >
                {label.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
            </span>
          );
        })}

        {scaleBar ? (
          <div className="near-me-scale" aria-hidden="true">
            <span className="near-me-scale-bar" style={{ width: scaleBar.width }} />
            <span className="near-me-scale-label">{scaleBar.label}</span>
          </div>
        ) : null}

        <span
          className="near-me-you"
          style={{ transform: `translate(${you.x}px, ${you.y}px)` }}
          aria-hidden="true"
        >
          <span className="near-me-you-halo" />
          <span className="near-me-you-dot" />
          <span className="near-me-you-label">You</span>
        </span>

        {size
          ? layout.groups.map((group) => {
              const leader = result.stories[group.members[0]];
              const at = toScreen(leader.x, leader.y);
              const offset = layout.pages.get(group.id);
              const count = group.members.length;
              const more = count > 1 ? `, and ${count - 1} more ${count === 2 ? 'story' : 'stories'}` : '';
              const label = `${leader.place}${leader.distance ? `, ${leader.distance}` : ''}: ${leader.story.title}${more}`;
              if (!offset) {
                return (
                  <button
                    key={group.id}
                    type="button"
                    className={`near-me-bubble${count > 1 ? '' : ' is-single'}`}
                    style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
                    aria-label={count > 1 ? `${count} stories near ${leader.place}; zoom in` : label}
                    onKeyDown={onKeyDown}
                    onClick={(e) => {
                      if (recentlyDragged(e)) return;
                      if (count > 1 && viewNow.current.w > MIN_WIDTH * 1.5) {
                        animateTo(zoomTarget(2.5, at.x, at.y));
                      } else {
                        choose(group, e);
                      }
                    }}
                  >
                    {count > 1 ? count : null}
                  </button>
                );
              }
              return (
                <button
                  key={group.id}
                  type="button"
                  className={`near-me-page${count > 1 ? ' is-stack' : ''}`}
                  style={{
                    transform: `translate(${at.x + offset.dx}px, ${at.y + offset.dy}px)`,
                    width: page,
                    height: page,
                    ['--page' as string]: `${page}px`,
                  }}
                  aria-pressed={selectedSet.has(leader.story.slug)}
                  aria-label={label}
                  onKeyDown={onKeyDown}
                  onClick={(e) => choose(group, e)}
                >
                  <span className="near-me-page-mast">The Golden Coast Journal</span>
                  <span className="near-me-page-photo">
                    <Image src={leader.story.imageUrl} alt="" fill sizes={`${page}px`} />
                  </span>
                  <span className="near-me-page-title">{leader.story.title}</span>
                  <span className="near-me-page-dek">{leader.story.dek}</span>
                  {count > 1 ? <span className="near-me-page-count">{count}</span> : null}
                </button>
              );
            })
          : null}

        <div className="near-me-controls">
          <button
            type="button"
            aria-label="Zoom in"
            onKeyDown={onKeyDown}
            onClick={() => animateTo(zoomTarget(2))}
          >
            <Plus size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onKeyDown={onKeyDown}
            onClick={() => animateTo(zoomTarget(0.5))}
          >
            <Minus size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Back to ${result.town}`}
            onKeyDown={onKeyDown}
            onClick={() => animateTo(result.view)}
          >
            <LocateFixed size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={expanded ? 'Shrink the map' : 'Open the map full screen'}
            aria-pressed={expanded}
            onKeyDown={onKeyDown}
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? (
              <Minimize2 size={16} aria-hidden="true" />
            ) : (
              <Maximize2 size={16} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div className="near-me-detail" aria-live="polite">
        {selectedStories.length ? (
          <>
            <p className="near-me-place">
              <MapPin size={13} aria-hidden="true" />
              {placeLine(selectedStories.map((item) => item.place))}
              {selectedStories[0].distance ? ` · ${selectedStories[0].distance}` : ''}
            </p>
            <ol>
              {selectedStories.map((item) => (
                <li key={item.story.slug}>
                  <StoryLink story={{ ...item.story, where: item.place }} group="map" />
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="near-me-hint">Move the map to find the Journal’s stories.</p>
        )}
        <p className="near-me-hint">
          Drag the map to explore; tap a front page to see it here, or a number to zoom in.
        </p>
      </div>
    </div>
  );
}

const ROADS = ['arterials', 'highways', 'motorways'] as const;

/**
 * The scale bar for a map at `unitsPerPixel` world units (a thousandth of a
 * degree of latitude) a pixel: the longest round distance (1, 2 or 5 of a
 * power of ten) that fits in a hundred pixels, in miles, or kilometres for a
 * reader where distances are.
 */
function scaleFor(unitsPerPixel: number, metric: boolean) {
  const perPixel = (unitsPerPixel / 1000) * (metric ? 111.13 : 69.05);
  const target = perPixel * 100;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const step = [5, 2, 1].map((m) => m * magnitude).find((value) => value <= target) ?? magnitude;
  const amount = Number(step.toPrecision(2)).toLocaleString('en-US');
  return { width: step / perPixel, label: `${amount} ${metric ? 'km' : 'mi'}` };
}

/** "Los Angeles · Hollywood · USC and 2 more": the places a stack holds. */
function placeLine(places: string[]) {
  const unique = [...new Set(places)];
  if (unique.length <= 3) return unique.join(' · ');
  return `${unique.slice(0, 3).join(' · ')} and ${unique.length - 3} more`;
}

function StoryLink({
  story,
  group,
  compact = false,
}: {
  story: NearCard;
  group: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/article/${story.slug}`}
      className={compact ? 'near-me-story is-compact' : 'near-me-story'}
      onClick={() => track('News Near Me Story Selected', { article_slug: story.slug, group })}
    >
      {compact ? null : (
        <span className="near-me-thumb photo-frame">
          <Image src={story.imageUrl} alt="" fill sizes="88px" />
        </span>
      )}
      <span className="near-me-copy">
        <em>{story.where}</em>
        <strong>{story.title}</strong>
      </span>
    </Link>
  );
}
