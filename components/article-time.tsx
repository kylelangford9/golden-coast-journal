import { articleTimestamp, type Article } from '@/lib/content';

type Props = {
  article: Article;
  /** Where to place the separator dot relative to the stamp, if any. */
  separator?: 'before' | 'after';
};

/**
 * Recency on a story card. Renders nothing at all when the date is unusable,
 * so the separator never dangles on its own.
 */
export function ArticleTime({ article, separator }: Props) {
  const stamp = articleTimestamp(article);
  if (!stamp) return null;

  return (
    <>
      {separator === 'before' ? ' · ' : null}
      <time dateTime={stamp.dateTime} title={stamp.fullDate}>
        {stamp.prefix ? `${stamp.prefix} ` : ''}
        {stamp.label}
      </time>
      {separator === 'after' ? ' · ' : null}
    </>
  );
}
