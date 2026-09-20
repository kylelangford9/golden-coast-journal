import Image from 'next/image';
import type { Official } from '@/lib/people';

/**
 * The first official a story names, shown where the story is named.
 *
 * The portrait is a link to the office that speaks for them, so a reader who
 * does not recognise a surname can go straight to the primary source. Portrait
 * and link both come from the California Votes register.
 */
export function OfficialChip({ official }: { official: Official | null }) {
  if (!official) return null;

  const portrait = (
    <span className="official-chip-portrait photo-frame">
      <Image src={official.photoUrl} alt="" fill sizes="34px" />
    </span>
  );

  return (
    <span className="official-chip">
      {official.url ? (
        <a
          href={official.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`${official.name}, ${official.office}; official site`}
        >
          {portrait}
        </a>
      ) : (
        portrait
      )}
      <span className="official-chip-name">{official.name}</span>
    </span>
  );
}
