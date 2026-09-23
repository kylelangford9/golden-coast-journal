import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ExternalLink, X } from 'lucide-react';
import type { Person, StoryPerson } from '@/lib/people';

/**
 * Who someone is, at the point a story names them.
 *
 * A reader meeting "Secretary Rubio" or "AB 1820 (Schiavo)" should not have to
 * leave the story to learn who that is. The first time the body names a
 * person, the name becomes a button; it opens a card with their face, office,
 * the official site that speaks for them and everything else the Journal has
 * reported about them.
 *
 * The card is a native popover: it opens without script, closes on Escape or a
 * tap outside, and follows its button in the tab order. The button sits inside
 * the paragraph; the card cannot (a <div> inside a <p> is not valid HTML), so
 * cards render once, after the body, and buttons point at them by id.
 */

// "State" rather than "California": the register also holds the governors of
// other states California works with, and a card reading "California" above
// "Governor of Washington" would contradict itself.
export const LEVEL_LABELS: Record<string, string> = {
  State: 'State',
  Local: 'Local',
  Federal: 'Federal',
  Judicial: 'Courts',
  International: 'World',
  Private: 'Beyond government',
};

export function levelLabel(level: string | null) {
  return (level && LEVEL_LABELS[level]) || 'In the news';
}

export function initials(name: string) {
  const words = name
    .replace(/["“”][^"“”]*["“”]/g, ' ')
    .split(/\s+/)
    .filter((word) => /^\p{Lu}/u.test(word) && !/^(Dr|Jr|Sr)\.?$/.test(word));
  return `${words[0]?.[0] || ''}${words.length > 1 ? words[words.length - 1][0] : ''}`;
}

export const cardId = (slug: string) => `person-card-${slug}`;
export const mentionId = (slug: string) => `mention-${slug}`;

/** A person's face, or their initials where the register has no portrait. */
export function PersonPortrait({
  person,
  size,
  className = 'person-portrait',
  eager = false,
}: {
  person: Pick<Person, 'name' | 'photoUrl'>;
  size: number;
  className?: string;
  /** Cards are hidden until opened; a lazy image would open blank. */
  eager?: boolean;
}) {
  return (
    <span
      className={`${className} photo-frame`}
      style={{ width: size, height: size }}
    >
      {person.photoUrl ? (
        <Image
          src={person.photoUrl}
          alt=""
          fill
          sizes={`${size}px`}
          loading={eager ? 'eager' : undefined}
        />
      ) : (
        <span className="person-monogram" aria-hidden="true">
          {initials(person.name)}
        </span>
      )}
    </span>
  );
}

type Mark = { start: number; end: number; slug: string };

/**
 * A paragraph with the people it introduces made into buttons. Marks must not
 * overlap; the article page passes at most one per person.
 */
export function MentionParagraph({
  text,
  marks,
}: {
  text: string;
  marks: Mark[];
}) {
  if (!marks.length) return <p>{text}</p>;
  const sorted = [...marks].sort((a, b) => a.start - b.start);
  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  for (const mark of sorted) {
    if (mark.start < cursor) continue;
    // A button is laid out as one unit, so a line could break between it and
    // the bracket or quote it sits in: "AB 1577 (" at the end of one line and
    // "Bauer-Kahan)" at the start of the next. The punctuation touching the
    // name is kept on the same line as the name.
    let before = mark.start;
    while (before > cursor && /[(“"‘'[]/.test(text[before - 1])) before -= 1;
    let after = mark.end;
    while (after < text.length && /[)”"’'\],.;:!?]/.test(text[after]))
      after += 1;
    pieces.push(text.slice(cursor, before));
    pieces.push(
      <span key={mark.slug} className="person-mention-glue">
        {text.slice(before, mark.start)}
        <button
          type="button"
          id={mentionId(mark.slug)}
          className="person-mention"
          popoverTarget={cardId(mark.slug)}
        >
          {text.slice(mark.start, mark.end)}
        </button>
        {text.slice(mark.end, after)}
      </span>,
    );
    cursor = after;
  }
  pieces.push(text.slice(cursor));
  return <p>{pieces}</p>;
}

export function PersonCards({ people }: { people: StoryPerson[] }) {
  if (!people.length) return null;
  return (
    <div className="person-cards">
      {people.map((person) => (
        <PersonCard key={person.slug} person={person} />
      ))}
    </div>
  );
}

function PersonCard({ person }: { person: StoryPerson }) {
  const id = cardId(person.slug);
  const firstName =
    person.name.split(/\s+/).find((word) => !/^(Dr|Hon)\.?$/.test(word)) ||
    person.name;
  return (
    <section
      id={id}
      popover="auto"
      className="person-card"
      aria-labelledby={`${id}-name`}
      data-person={person.slug}
    >
      <div className="person-card-head">
        <PersonPortrait person={person} size={72} eager />
        <div>
          <p className="eyebrow">{levelLabel(person.level)}</p>
          <h2 id={`${id}-name`}>{person.name}</h2>
          <p className="person-card-office">
            {person.office}
            {person.party ? ` · ${person.party}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="person-card-close"
          popoverTarget={id}
          popoverTargetAction="hide"
          aria-label={`Close ${person.name}`}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <p className="person-card-count">
        {person.mentions === 1
          ? 'Named once in this story.'
          : `Named ${person.mentions} times in this story.`}
      </p>
      <div className="person-card-actions">
        <Link href={`/people/${person.slug}`}>
          Everything the Journal has reported on {firstName}
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
        {person.url ? (
          <a href={person.url} target="_blank" rel="noreferrer">
            Official site <ExternalLink size={12} aria-hidden="true" />
          </a>
        ) : null}
      </div>
      {person.portrait ? (
        <p className="person-card-credit">Portrait: {person.portrait.credit}</p>
      ) : null}
    </section>
  );
}
