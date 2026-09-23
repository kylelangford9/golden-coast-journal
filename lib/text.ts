export function decodeHtmlEntities(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * The sentence around a mention, trimmed to something a list can show, with
 * the mention's position inside it.
 */
export function excerptAround(part: string, start: number, end: number) {
  const before = part.slice(0, start);
  // A stop that is not there means the sentence starts the paragraph; adding
  // the stop's width to -1 would cut its first letter off.
  const sentenceStart = Math.max(
    0,
    ...['. ', '? ', '! ', '; ']
      .map((stop) => before.lastIndexOf(stop))
      .filter((at) => at !== -1)
      .map((at) => at + 2),
  );
  const stops = ['. ', '? ', '! ', '; ']
    .map((stop) => part.indexOf(stop, end))
    .filter((at) => at !== -1);
  const sentenceEnd = stops.length ? Math.min(...stops) + 1 : part.length;
  let from = sentenceStart;
  let to = sentenceEnd;
  const MAX = 260;
  if (to - from > MAX) {
    from = Math.max(from, start - 110);
    to = Math.min(to, end + 140);
  }
  const lead = from > sentenceStart ? '…' : '';
  const tail = to < sentenceEnd ? '…' : '';
  const raw = part.slice(from, to);
  const trimmed = raw.length - raw.trimStart().length;
  const markStart = lead.length + (start - from - trimmed);
  return {
    text: `${lead}${raw.trim()}${tail}`,
    markStart,
    markEnd: markStart + (end - start),
  };
}
