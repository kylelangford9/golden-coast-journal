import Image from 'next/image';
import Link from 'next/link';
import type { Official } from '@/lib/people';

/**
 * The first person a story names, shown where the story is named.
 *
 * The chip leads to the person's page on the Journal, which holds their office,
 * the official site that speaks for them and every story that names them, so
 * a reader who does not recognise a surname can find out without leaving.
 */
export function OfficialChip({ official }: { official: Official | null }) {
  if (!official) return null;

  return (
    <Link
      href={`/people/${official.slug}`}
      className="official-chip"
      aria-label={`${official.name}, ${official.office}`}
    >
      <span className="official-chip-portrait photo-frame">
        <Image src={official.photoUrl} alt="" fill sizes="34px" />
      </span>
      <span className="official-chip-name">{official.name}</span>
    </Link>
  );
}
