/**
 * The checks a machine-written draft must pass before it may publish itself.
 *
 * Each one is a failure that reached readers on Sept. 24, 2026: paragraphs
 * opening "Verified:" and "Practical consequence;" like a fact-check worksheet,
 * a court's finding printed as the governor's words, "25-state coalition" for
 * 25 attorneys general, and a quotation whose dash became a semicolon. The
 * drafting instructions ask for none of these; this is what holds a draft back
 * when the model does them anyway. A draft that fails is not discarded; it
 * goes to the review queue with the reasons in its editorial action note.
 *
 * Kept free of imports, like lib/asset-matching.ts, so
 * scripts/draft-checks.test.mjs runs the real rules straight from the source.
 */

export type DraftForChecks = {
  title: string;
  dek: string;
  body: string[];
  keyPoints: string[];
};

/** The longest headline the front page and a search result can carry whole. */
export const MAX_HEADLINE_CHARACTERS = 110;
const MAX_KEY_POINT_CHARACTERS = 300;

/**
 * A worksheet label at the start of a paragraph or key point: "Verified:",
 * "Source claims:", "Analysis and limits:", "What the county did not specify:",
 * "Practical consequence;" and the like. Attribution belongs inside the
 * sentence ("the county said"), not in front of it.
 */
const OPENING_LABEL = new RegExp(
  '^(?:' +
    [
      'verified(?: facts?)?',
      'source (?:claims?|evidence|material)',
      'observed(?: [^:;]{0,40})?',
      'analysis(?: [^:;]{0,30})?',
      'inference',
      'background',
      'quote(?: [^:;]{0,30})?',
      'practical (?:consequences?|steps|implications?)(?: [^:;]{0,30})?',
      'legal holdings?',
      'best[- ]evidenced [^:;]{0,40}',
      'requested [^:;]{0,50}',
      'immediate implications?[^:;]{0,40}',
      'what (?:this|it) means[^:;]{0,40}',
      'what [^:;]{0,60}(?:did not|does not|didn’t|doesn’t|didn\'t|doesn\'t|has not|hasn’t|hasn\'t) [^:;]{0,60}',
      'what (?:remains|is) (?:not (?:yet )?)?(?:known|unknown|unresolved|unclear|unreported)[^:;]{0,40}',
    ].join('|') +
    ')\\s*[:;]',
  'i',
);

/** The same labels part-way through a paragraph, and a trailing "Source:". */
const INLINE_LABEL =
  /(?:\b(?:practical consequences?|source claims?|verified facts?)\s*[:;])|(?:(?:^|[.;]\s*)source:\s)/i;

/**
 * Text as a quotation is compared with the source: lower case, with everything
 * but letters, digits, semicolons and single spaces removed, so typographic
 * quotes, apostrophes, commas and line breaks cannot make a faithful quotation
 * look altered. Semicolons stay because the house style writes them where
 * speakers used dashes; a semicolon the speaker never used is an alteration.
 */
export function normalizeForComparison(value: string) {
  return value
    .toLowerCase()
    .replace(/;/g, ' ; ')
    .replace(/[^\p{L}\p{N};]+/gu, ' ')
    .trim();
}

/** Everything the draft puts in double quotation marks. */
export function quotationsIn(text: string) {
  const found: string[] = [];
  for (const pattern of [/“([^“”]{1,800})”/g, /"([^"]{1,800})"/g])
    for (const match of text.matchAll(pattern)) found.push(match[1]);
  return found;
}

/**
 * Whether a quotation appears word for word in the source. An ellipsis or a
 * bracketed insertion marks an elision, so each stretch between them is
 * checked on its own; so is each sentence, because a quotation may join two
 * sentences the source separates with "said the coordinator."
 */
export function quotationInSource(quotation: string, normalizedSource: string) {
  return quotation
    .split(/\.\.\.|…|\[[^\]]*\]|(?<=[.!?])\s+/)
    .map(normalizeForComparison)
    .filter(Boolean)
    .every((piece) => ` ${normalizedSource} `.includes(` ${piece} `));
}

/**
 * The figures a draft states: runs of digits, with thousands separators
 * dropped and ordinal or plural endings allowed ("59th", "1940s"). A digit
 * fixed to a letter ("CO2e", "H-1B") is part of a name, not a figure.
 */
export function figuresIn(text: string) {
  const figures = new Set<string>();
  for (const match of text.matchAll(
    /(?<![\p{L}\p{N}.])(\d[\d,]*(?:\.\d+)?)(?:st|nd|rd|th|s)?(?![\p{L}\p{N}])/gu,
  ))
    figures.add(match[1].replace(/,/g, '').replace(/\.$/, ''));
  return figures;
}

/** Every run of digits in the source, read generously so none is missed. */
export function figuresInSource(text: string) {
  const figures = new Set<string>();
  for (const match of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const figure = match[0].replace(/,+$/, '');
    figures.add(figure.replace(/,/g, ''));
    for (const part of figure.split(/[,.]/)) if (part) figures.add(part);
  }
  return figures;
}

/**
 * Counts of states, counties and countries the draft states that the source
 * does not state in the same terms. A coalition of 25 attorneys general
 * included the District of Columbia and American Samoa, and the pipeline
 * called it a "25-state coalition"; every figure was in the source, just
 * attached to a different noun.
 */
export function unsourcedJurisdictionCounts(text: string, sourceText: string) {
  // The source may put a word or two between ("47 other states"); the draft
  // may not, so "25 state attorneys general" is still read as 25 states.
  const counted = (value: string, between: number) => {
    const found = new Set<string>();
    for (const match of value.matchAll(
      new RegExp(
        `(?<![\\p{L}\\p{N}])(\\d[\\d,]*)(?:[\\s‐‑–-]+\\p{L}+){0,${between}}?[\\s‐‑–-]+(state|count(?:y|ie)|countr(?:y|ie)|nation)s?(?![\\p{L}])`,
        'giu',
      ),
    )) {
      // "Nov. 4–11 county buildings" and "in 2024 County data" are dates, not
      // counts of counties.
      const before = value.slice(Math.max(0, match.index - 12), match.index);
      if (
        /^(?:1[89]|20)\d\d$/.test(match[1]) ||
        /\d\s*[‐‑–-]\s*$/.test(before) ||
        /\b(?:jan|feb|mar|apr|may|june?|july?|aug|sept?|oct|nov|dec)[a-z]*\.?\s*$/i.test(
          before,
        )
      )
        continue;
      found.add(
        `${match[1].replace(/,/g, '')} ${match[2].toLowerCase().replace(/ie$/, 'y')}`,
      );
    }
    return found;
  };
  const inSource = counted(sourceText, 2);
  return [...counted(text, 0)].filter((count) => !inSource.has(count));
}

/**
 * The reasons a draft may not publish without a person reading it first; an
 * empty list means it may. `sourceText` is the page text the model was given.
 */
export function draftProblems(draft: DraftForChecks, sourceText: string) {
  const problems: string[] = [];
  const passages = [draft.title, draft.dek, ...draft.body, ...draft.keyPoints];
  const everything = passages.join('\n');

  const labelled = [...draft.body, ...draft.keyPoints].filter(
    (passage) =>
      OPENING_LABEL.test(passage.trim()) || INLINE_LABEL.test(passage),
  );
  if (labelled.length)
    problems.push(
      `worksheet labels in the copy: "${labelled[0].trim().slice(0, 60)}…"`,
    );

  const normalizedSource = normalizeForComparison(sourceText);
  const quotations = quotationsIn(everything);
  const unsourced = quotations.filter(
    (quotation) => !quotationInSource(quotation, normalizedSource),
  );
  if (unsourced.length)
    problems.push(
      `quotation not found word for word in the source: “${unsourced[0].slice(0, 80)}”`,
    );
  if (quotations.some((quotation) => /\u2014|\s\u2013\s/.test(quotation)))
    problems.push(
      'a quotation contains a dash, which house punctuation would alter; quote around it',
    );

  const sourceFigures = figuresInSource(sourceText);
  const unsourcedFigures = [...figuresIn(everything)].filter(
    (figure) => !sourceFigures.has(figure),
  );
  if (unsourcedFigures.length)
    problems.push(
      `figures not in the source: ${unsourcedFigures.slice(0, 6).join(', ')}`,
    );
  const miscounted = unsourcedJurisdictionCounts(everything, sourceText);
  if (miscounted.length)
    problems.push(
      `a count the source does not make: ${miscounted.slice(0, 3).join(', ')}`,
    );

  if (draft.title.length > MAX_HEADLINE_CHARACTERS)
    problems.push(`headline runs ${draft.title.length} characters`);
  if (
    draft.keyPoints.some(
      (point) => /\n/.test(point) || point.length > MAX_KEY_POINT_CHARACTERS,
    )
  )
    problems.push('a key point runs on or breaks across lines');

  return problems;
}
