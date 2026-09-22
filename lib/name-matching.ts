/**
 * Deciding whether a story actually names a particular official.
 *
 * Separate from lib/people.ts because none of it touches the database: it is
 * pure string work over an article's text, and keeping it that way lets
 * scripts/official-mentions.test.mjs exercise the real rules against real
 * article prose rather than asserting on the shape of the source.
 */

/**
 * Put typographic punctuation back into its plain form, character for
 * character so offsets are unchanged.
 *
 * Wire copy is not typed the way a register is. Two published stories spell
 * the assembly member "Bauer‑Kahan" with a non-breaking hyphen (U+2011) while
 * `representatives` holds "Rebecca Bauer-Kahan" with a plain one, and neither
 * her full name nor her surname matched, so the author of the bill the story
 * was about got no portrait. The same goes for curly apostrophes in O'Donnell
 * and for non-breaking spaces.
 */
export function normalizePunctuation(value: string) {
  return value
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’ʼ´]/g, "'")
    .replace(/[   ]/g, ' ');
}

const isInitial = (part: string) => /^[A-Za-z]\.?$/.test(part);

export function surnameOf(name: string) {
  const parts = normalizePunctuation(name)
    .trim()
    .split(/\s+/)
    .filter((p) => !isInitial(p));
  return (parts[parts.length - 1] || '').toLowerCase();
}

/**
 * The spellings of a name that should count as naming this person outright.
 *
 * The register carries middle initials the newsroom usually drops: stories say
 * "Assemblymember Tina McKinnor", the register says "Tina S. McKinnor". Without
 * the shortened form that falls back to a bare-surname match, which is the weak
 * signal the guard below has to second-guess. Both forms are still whole names,
 * so widening this way adds no new way to pick the wrong person.
 */
export function nameForms(name: string) {
  const parts = normalizePunctuation(name).trim().split(/\s+/);
  const full = parts.join(' ').toLowerCase();
  const withoutInitials = parts.filter((p) => !isInitial(p));
  const short = withoutInitials.join(' ').toLowerCase();
  return short && short !== full && withoutInitials.length > 1
    ? [full, short]
    : [full];
}

const isWordChar = (ch: string) => /[a-z0-9]/i.test(ch);

/**
 * Whole-word containment, scanned rather than compiled into a pattern. Names
 * carry apostrophes, hyphens and periods, and building a regex out of them
 * invites an escaping bug for no gain. The boundary check is what matters: it
 * keeps "Bass" from firing inside "bassist".
 */
export function mentions(haystack: string, needle: string) {
  if (!needle) return false;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at === -1) return false;
    const before = at === 0 ? '' : haystack[at - 1];
    const after = haystack[at + needle.length] || '';
    if (!isWordChar(before) && !isWordChar(after)) return true;
    from = at + 1;
  }
}

/**
 * Words that can stand beside a surname without being a different person's
 * name: "Governor Newsom" is still Newsom, "Reynold Hoover" is not our Hoover.
 * Stored lowercase; the comparison lowercases the token it reads.
 */
const HONORIFICS = new Set([
  'governor',
  'gov',
  'lt',
  'lieutenant',
  'senator',
  'sen',
  'assemblymember',
  'assemblywoman',
  'assemblyman',
  'representative',
  'rep',
  'congressman',
  'congresswoman',
  'speaker',
  'mayor',
  'attorney',
  'general',
  'secretary',
  'controller',
  'treasurer',
  'superintendent',
  'commissioner',
  'president',
  'vice',
  'chair',
  'chairman',
  'chairwoman',
  'justice',
  'judge',
  'mr',
  'mrs',
  'ms',
  'dr',
  'state',
  'california',
  'u.s',
  'us',
  'former',
  'and',
  'by',
  'said',
]);

/** Characters that can sit inside a name token: letters, digits, ' - . accents. */
const NAME_TOKEN = /[\p{L}\p{N}'’.-]/u;

function tokenBefore(text: string, at: number) {
  // Only a single space counts as adjacency. A comma, bracket or line break
  // between the words means they are not one name, which is what keeps the
  // bill-author form "AB 2411 (McKinnor) directs" matching.
  if (at < 1 || text[at - 1] !== ' ') return '';
  const end = at - 1;
  let start = end;
  while (start > 0 && NAME_TOKEN.test(text[start - 1])) start -= 1;
  return text.slice(start, end);
}

function tokenAfter(text: string, at: number) {
  if (text[at] !== ' ') return '';
  const start = at + 1;
  let end = start;
  while (end < text.length && NAME_TOKEN.test(text[end])) end += 1;
  return text.slice(start, end);
}

const startsCapital = (token: string) => /^\p{Lu}/u.test(token);

/**
 * Whether a bare surname in this story plainly belongs to somebody else.
 *
 * A surname on its own is a weak signal, and the register carries 186 of them.
 * Real published stories contain "Simon Stiell" (the UN climate chief, not Rep.
 * Lateefah Simon), "Cal OES Director Caroline Thomas Jacobs" (not Rep. Sara
 * Jacobs), "Reynold Hoover, CEO of LA28" (not Assemblymember Josh Hoover) and
 * "Johnson Space Center" (not Assemblymember Natasha Johnson). Every one of
 * those puts another capitalised name hard against the surname.
 *
 * So: if any occurrence of the surname is flanked, across a single space, by a
 * capitalised word that is neither an honorific nor part of this official's own
 * name, the surname is someone else's in this story and no occurrence of it
 * counts. Showing no face is a far smaller error than showing the wrong one.
 *
 * `text` and `lower` must be the same string, one lowercased, so an offset
 * found in `lower` reads the original capitalisation in `text`.
 */
export function surnameBelongsToSomeoneElse(
  text: string,
  lower: string,
  surname: string,
  ownName: string,
) {
  const own = new Set(
    ownName
      .toLowerCase()
      .split(/\s+/)
      .map((part) => part.replace(/[.,]+$/, '')),
  );
  const isOutsider = (token: string) => {
    if (!token || !startsCapital(token)) return false;
    const key = token.toLowerCase().replace(/[.,]+$/, '');
    return !own.has(key) && !HONORIFICS.has(key);
  };

  let from = 0;
  for (;;) {
    const at = lower.indexOf(surname, from);
    if (at === -1) return false;
    const end = at + surname.length;
    const whole =
      !isWordChar(lower[at - 1] || '') && !isWordChar(lower[end] || '');
    if (
      whole &&
      (isOutsider(tokenBefore(text, at)) || isOutsider(tokenAfter(text, end)))
    )
      return true;
    from = at + 1;
  }
}

/**
 * A person the register offers as a possible subject, reduced to the fields
 * that could tell them apart from a namesake.
 */
export type NameCandidate = {
  name: string;
  office?: string | null;
  level?: string | null;
  district?: string | null;
  city?: string | null;
  county?: string | null;
};

/**
 * How the newsroom writes an office, as against how the register stores it.
 * Copy says "Rep." and "Assemblymember"; the register says "U.S.
 * Representative" and "State Assembly Member". A namesake pair is only ever
 * separated by the words that actually appear in the story.
 */
const OFFICE_SYNONYMS: { held: string; written: string[] }[] = [
  {
    held: 'u.s. representative',
    written: [
      'u.s. representative',
      'us representative',
      'rep.',
      'congressman',
      'congresswoman',
      'congressmember',
      'member of congress',
      'house of representatives',
      'u.s. house',
      'congressional district',
      'congress',
    ],
  },
  {
    held: 'u.s. senator',
    written: ['u.s. senator', 'us senator', 'united states senator', 'senator'],
  },
  {
    held: 'state assembly member',
    written: [
      'state assembly',
      'assembly member',
      'assemblymember',
      'assemblywoman',
      'assemblyman',
      'assembly district',
      'the assembly',
    ],
  },
  {
    held: 'state senator',
    written: ['state senator', 'state senate', 'senate district', 'senator'],
  },
  { held: 'governor', written: ['governor', 'gov.'] },
  { held: 'mayor', written: ['mayor'] },
  { held: 'sheriff', written: ['sheriff', "sheriff's department"] },
  { held: 'district attorney', written: ['district attorney', 'prosecutor'] },
  { held: 'supervisor', written: ['supervisor', 'board of supervisors'] },
  { held: 'justice', written: ['justice', 'supreme court', 'the court'] },
  { held: 'judge', written: ['judge', 'the court'] },
  { held: 'attorney general', written: ['attorney general'] },
  { held: 'chancellor', written: ['chancellor'] },
  { held: 'superintendent', written: ['superintendent'] },
  { held: 'chief executive', written: ['chief executive', 'ceo'] },
  { held: 'president', written: ['president'] },
  { held: 'director', written: ['director'] },
  { held: 'secretary', written: ['secretary'] },
  { held: 'commissioner', written: ['commissioner'] },
  { held: 'chair', written: ['chair', 'chairman', 'chairwoman'] },
];

/**
 * Everything in a story that could show it means this candidate and not the
 * namesake standing next to them: the fuller spellings of the name, the words
 * the office is written with, the district code, the city and the county.
 *
 * Deliberately not the party. California's two Robert Garcias are both
 * Democrats, and a party name beside a surname is weak evidence in any case.
 */
export function candidateEvidence(candidate: NameCandidate) {
  const terms = new Set<string>(nameForms(candidate.name));
  const add = (value: string | null | undefined) => {
    const term = normalizePunctuation(value || '')
      .trim()
      .toLowerCase();
    // Two characters is below the length at which a term identifies anybody,
    // and a bare district number would fire on any figure in the copy.
    if (term.length > 2 && /[a-z]/.test(term)) terms.add(term);
  };

  const office = normalizePunctuation(candidate.office || '').toLowerCase();
  add(office);
  for (const { held, written } of OFFICE_SYNONYMS)
    if (office.includes(held)) written.forEach(add);
  add(candidate.district);
  add(candidate.city);
  add(candidate.county);
  return [...terms];
}

/**
 * Which of several people sharing one full name a story is about.
 *
 * California has two officials called Robert Garcia: a U.S. representative
 * from Long Beach and a state assembly member from Rancho Cucamonga. Both are
 * named outright by the same three words, so a full-name match cannot separate
 * them and the tie used to fall to whichever sorted first. A reader then saw
 * the wrong man's face beside a story about the other.
 *
 * The rule here: collect what each candidate could be recognised by, throw away
 * everything two or more of them share (a term both could answer to proves
 * nothing), and see who is left standing in the story's own words. Exactly one
 * supported candidate wins. Nobody supported, or more than one, returns -1 and
 * the caller shows no portrait at all: the story did not say which man it
 * meant, and a coin flip is not an answer a newspaper can print.
 *
 * `lower` is the lowercased article text, padded and punctuation-normalised by
 * the caller exactly as the rest of this module expects.
 */
export function disambiguateSameName(
  lower: string,
  candidates: NameCandidate[],
) {
  if (candidates.length < 2) return candidates.length - 1;

  const evidence = candidates.map((c) => new Set(candidateEvidence(c)));
  const shared = new Set<string>();
  for (let i = 0; i < evidence.length; i += 1)
    for (const term of evidence[i])
      for (let j = 0; j < evidence.length; j += 1)
        if (j !== i && evidence[j].has(term)) shared.add(term);

  let winner = -1;
  for (let i = 0; i < evidence.length; i += 1) {
    const supported = [...evidence[i]].some(
      (term) => !shared.has(term) && mentions(lower, term),
    );
    if (!supported) continue;
    if (winner !== -1) return -1;
    winner = i;
  }
  return winner;
}
