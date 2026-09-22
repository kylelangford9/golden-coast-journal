import Image from 'next/image';
import { ExternalLink } from 'lucide-react';
import type { Official } from '@/lib/people';

/**
 * The people a story is about, with the portrait and official link the
 * California Votes register already holds for them. Readers get a face and a
 * route to the primary source rather than a surname they have to look up.
 */
export function OfficialMentions({
  officials,
  heading = 'In this story',
}: {
  officials: Official[];
  heading?: string;
}) {
  if (!officials.length) return null;
  return (
    <aside className="official-mentions" aria-label={heading}>
      <p className="eyebrow">{heading}</p>
      <ul>
        {officials.map((official) => (
          <li key={`${official.name}-${official.office}`}>
            <span className="official-portrait photo-frame">
              <Image
                src={official.photoUrl}
                alt={official.name}
                fill
                sizes="56px"
              />
            </span>
            <span className="official-copy">
              <strong>{official.name}</strong>
              <small>
                {official.office}
                {official.party ? `; ${official.party}` : ''}
              </small>
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
          </li>
        ))}
      </ul>
    </aside>
  );
}
