import Image from 'next/image';
import Link from 'next/link';
import { ArrowDown, ExternalLink } from 'lucide-react';
import type { Official } from '@/lib/people';
import { mentionId } from '@/components/person-card';

/**
 * The people a story is about, with their portraits. Each name leads to the
 * person's page on the Journal; where the body names them, a link jumps to
 * that first mention, whose card holds the rest; and the official site is one
 * click away for a reader who wants the primary source.
 */
export function OfficialMentions({
  officials,
  heading = 'In this story',
}: {
  officials: (Official & { inBody?: boolean })[];
  heading?: string;
}) {
  if (!officials.length) return null;
  return (
    <aside className="official-mentions" aria-label={heading}>
      <p className="eyebrow">{heading}</p>
      <ul>
        {officials.map((official) => (
          <li key={`${official.name}-${official.office}`}>
            <Link
              href={`/people/${official.slug}`}
              className="official-portrait photo-frame"
              tabIndex={-1}
              aria-hidden="true"
            >
              <Image
                src={official.photoUrl}
                alt={official.name}
                fill
                sizes="56px"
              />
            </Link>
            <span className="official-copy">
              <strong>
                <Link href={`/people/${official.slug}`}>{official.name}</Link>
              </strong>
              <small>
                {official.office}
                {official.party ? `; ${official.party}` : ''}
              </small>
              <span className="official-links">
                {official.inBody ? (
                  <a
                    href={`#${mentionId(official.slug)}`}
                    aria-label={`Where ${official.name} is named in this story`}
                  >
                    Where named <ArrowDown size={11} aria-hidden="true" />
                  </a>
                ) : null}
                {official.url ? (
                  // Several people can appear here, so the link needs to say
                  // whose site it is. Without the label a screen reader hears
                  // "Official site" repeated with nothing to tell them apart.
                  <a
                    href={official.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${official.name}, ${official.office}; official site`}
                  >
                    Official site <ExternalLink size={11} aria-hidden="true" />
                  </a>
                ) : null}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
