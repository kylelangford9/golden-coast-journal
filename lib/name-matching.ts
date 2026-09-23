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

/**
 * Take the accents off, again character for character so offsets are
 * unchanged.
 *
 * The register spells a name the way its owner does, "Recep Tayyip Erdoğan",
 * "Volker Türk", "Pedro Sánchez"; wire copy and press releases often do not.
 * Both sides of every comparison are folded, so either spelling finds the
 * other. A letter with no plain form ("ß", "ø") stays as it is.
 */
export function foldAccents(value: string) {
  return value.replace(/[\u0080-￿]/g, (ch) => {
    const base = ch.normalize('NFD');
    return base.length > 1 && /^\p{M}+$/u.test(base.slice(1)) ? base[0] : ch;
  });
}

/** A register spelling as it is compared: composed first, then folded. */
const needle = (name: string) => foldAccents(name.normalize('NFC'));

const isInitial = (part: string) => /^[A-Za-z]\.?$/.test(part);

/** A token reduced to what identifies it: lowercase, no accents, periods or commas. */
const tokenKey = (token: string) =>
  foldAccents(token.toLowerCase()).replace(/[.,]/g, '');

/**
 * Words the register writes around a name that no story prints as part of it.
 * `representatives` holds "Dr. Joaquin Arambula", "José Luis Solache Jr." and
 * "Gilbert Ray Cisneros, Jr."; the copy says "Assemblymember Joaquin
 * Arambula", and the surname of the second man is Solache, not "jr.".
 */
const NAME_PREFIXES = new Set(['dr', 'hon', 'mr', 'mrs', 'ms', 'rev']);
const NAME_SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv']);

/**
 * A register name split into the parts a story could print, with any quoted
 * nickname ('Steven "Steve" Choi') lifted out on its own.
 */
function nameParts(name: string) {
  const plain = normalizePunctuation(name);
  const nickname = plain.match(/["“”]([^"“”]+)["“”]/)?.[1]?.trim() || null;
  const parts = plain
    .replace(/["“”][^"“”]*["“”]/g, ' ')
    .replace(/,/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  while (parts.length > 2 && NAME_PREFIXES.has(tokenKey(parts[0])))
    parts.shift();
  while (
    parts.length > 2 &&
    NAME_SUFFIXES.has(tokenKey(parts[parts.length - 1]))
  )
    parts.pop();
  return { parts, nickname };
}

export function surnameOf(name: string) {
  const parts = nameParts(name).parts.filter((p) => !isInitial(p));
  return (parts[parts.length - 1] || '').toLowerCase();
}

/**
 * One spelling per person, used to recognise two register rows as namesakes:
 * the name without honorifics, suffixes or middle initials.
 */
export function canonicalName(name: string) {
  return nameParts(name)
    .parts.filter((p) => !isInitial(p))
    .join(' ')
    .toLowerCase();
}

/**
 * The spellings of a name that should count as naming this person outright.
 *
 * The register carries middle initials the newsroom usually drops: stories say
 * "Assemblymember Tina McKinnor", the register says "Tina S. McKinnor". It also
 * carries middle names ("Rick Chavez Zbur", "Caroline Thomas Jacobs"),
 * honorifics, suffixes and nicknames. Without the shortened forms a story falls
 * back to a bare-surname match, which is the weak signal the guards below have
 * to second-guess. Every form is still two or more words of the person's own
 * name, so widening this way adds no new way to pick the wrong person.
 */
export function nameForms(name: string) {
  const { parts, nickname } = nameParts(name);
  const forms = new Set<string>();
  const add = (words: string[]) => {
    if (words.length > 1) forms.add(words.join(' ').toLowerCase());
  };
  add(parts);
  const withoutInitials = parts.filter((p) => !isInitial(p));
  add(withoutInitials);
  if (withoutInitials.length > 2)
    add([withoutInitials[0], withoutInitials[withoutInitials.length - 1]]);
  if (nickname) add([nickname, withoutInitials[withoutInitials.length - 1]]);
  // The register's own spelling, exactly, for a story that copies it.
  forms.add(
    normalizePunctuation(name).trim().split(/\s+/).join(' ').toLowerCase(),
  );
  return [...forms];
}

const aliasWords = (alias: string) =>
  normalizePunctuation(alias).trim().split(/\s+/).filter(Boolean);

/** Every spelling that names this person outright, aliases included. */
function fullForms(candidate: NameCandidate) {
  const forms = new Set(nameForms(candidate.name));
  for (const alias of candidate.aliases || []) {
    const words = aliasWords(alias);
    if (words.length > 1) forms.add(words.join(' ').toLowerCase());
  }
  return [...forms];
}

/** The single words that can stand for this person: surname and one-word aliases. */
function surnamesOf(candidate: NameCandidate) {
  const words = new Set([foldAccents(surnameOf(candidate.name))]);
  for (const alias of candidate.aliases || []) {
    const parts = aliasWords(alias);
    if (parts.length === 1) words.add(foldAccents(parts[0].toLowerCase()));
  }
  return [...words];
}

const isWordChar = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

/**
 * Whole-word containment, scanned rather than compiled into a pattern. Names
 * carry apostrophes, hyphens and periods, and building a regex out of them
 * invites an escaping bug for no gain. The boundary check is what matters: it
 * keeps "Bass" from firing inside "bassist".
 */
export function mentions(haystack: string, name: string) {
  return firstMention(haystack, name) !== -1;
}

/** Where `name` first appears as whole words in `text`, accents aside, or -1. */
export function firstMention(text: string, name: string) {
  if (!name) return -1;
  const haystack = foldAccents(text);
  const word = needle(name);
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(word, from);
    if (at === -1) return -1;
    const before = at === 0 ? '' : haystack[at - 1];
    const after = haystack[at + word.length] || '';
    if (!isWordChar(before) && !isWordChar(after)) return at;
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

/**
 * The joining words inside a name: "Al" in "Tamim bin Hamad Al Thani", "da" in
 * "Lula da Silva". Whose surname it is gets decided by the word on the far side
 * of them. "Mohammed bin Abdulrahman Al Thani" is Qatar's prime minister, not
 * its emir, and the "Al" against "Thani" is in both men's names.
 */
const PARTICLES = new Set([
  'al',
  'el',
  'bin',
  'bint',
  'ibn',
  'da',
  'de',
  'del',
  'della',
  'di',
  'dos',
  'du',
  'van',
  'von',
  'der',
  'den',
]);

function neighbourBefore(text: string, at: number) {
  let end = at;
  let token = tokenBefore(text, end);
  while (token && PARTICLES.has(tokenKey(token))) {
    end -= token.length + 1;
    token = tokenBefore(text, end);
  }
  return token;
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
  const isOutsider = outsiderTest(ownName);
  for (const at of wholeWordOffsets(foldAccents(lower), surname)) {
    const end = at + surname.length;
    if (
      isOutsider(neighbourBefore(text, at)) ||
      isOutsider(tokenAfter(text, end))
    )
      return true;
  }
  return false;
}

/**
 * Whether a token beside a surname is another person's name: capitalised, and
 * neither an honorific nor a part of this person's own name or the other names
 * the register knows them by. Periods are ignored on both sides, so "J.D.
 * Vance" is Vance's own name and "U.S." is the honorific "us".
 */
function outsiderTest(ownName: string, aliases: readonly string[] = []) {
  const { parts, nickname } = nameParts(ownName);
  const own = new Set(
    [
      ...parts,
      ...(nickname ? [nickname] : []),
      ...aliases.flatMap((alias) => nameParts(alias).parts),
    ].map(tokenKey),
  );
  return (token: string) => {
    if (!token || !startsCapital(token)) return false;
    const key = tokenKey(token);
    return (
      !own.has(key) &&
      !HONORIFICS.has(key) &&
      !HONORIFICS.has(token.toLowerCase().replace(/[.,]+$/, ''))
    );
  };
}

/** `lower` must already be folded (see foldAccents); `word` is folded here. */
function* wholeWordOffsets(lower: string, name: string) {
  const word = needle(name);
  let from = 0;
  for (;;) {
    const at = lower.indexOf(word, from);
    if (at === -1) return;
    const end = at + word.length;
    if (!isWordChar(lower[at - 1] || '') && !isWordChar(lower[end] || ''))
      yield at;
    from = at + 1;
  }
}

/**
 * A person the register offers as a possible subject, reduced to the fields
 * that could tell them apart from a namesake.
 */
export type NameCandidate = {
  name: string;
  /**
   * Other names stories use for this person, curated in the register: "Lula"
   * for Luiz Inácio Lula da Silva, "Zelensky" for Volodymyr Zelenskyy, "Tedros"
   * for Tedros Adhanom Ghebreyesus. A name of two or more words counts as
   * naming them in full; a single word is treated exactly as a surname, with
   * every guard a surname gets. Names only: "the emir of Qatar" is an office,
   * and an office changes hands without the register being told.
   */
  aliases?: readonly string[] | null;
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
  const terms = new Set<string>(fullForms(candidate));
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

/**
 * The office a title in the copy points at, as words the register's `office`
 * contains. A title is evidence both ways: "Secretary Rubio" is the Secretary
 * of State and plainly not State Sen. Susan Rubio, "Director Jacobs" is not
 * Rep. Sara Jacobs, and "Prime Minister Sánchez" is nobody in the register.
 */
const TITLES = new Map<string, string[]>([
  ['governor', ['governor']],
  ['gov', ['governor']],
  ['president', ['president']],
  ['senator', ['senator']],
  ['senators', ['senator']],
  ['sen', ['senator']],
  ['sens', ['senator']],
  ['assemblymember', ['assembly']],
  ['assemblymembers', ['assembly']],
  ['assemblywoman', ['assembly']],
  ['assemblyman', ['assembly']],
  ['rep', ['u.s. representative']],
  ['reps', ['u.s. representative']],
  ['representative', ['u.s. representative']],
  ['congressman', ['u.s. representative']],
  ['congresswoman', ['u.s. representative']],
  ['congressmember', ['u.s. representative']],
  ['mayor', ['mayor']],
  ['sheriff', ['sheriff']],
  ['supervisor', ['supervisor']],
  ['justice', ['justice']],
  ['judge', ['judge']],
  ['secretary', ['secretary']],
  ['secretary-general', ['secretary-general']],
  ['director', ['director']],
  ['administrator', ['administrator']],
  ['chancellor', ['chancellor']],
  ['commissioner', ['commissioner']],
  ['chair', ['chair']],
  ['chairman', ['chair']],
  ['chairwoman', ['chair']],
  ['chairperson', ['chair']],
  ['superintendent', ['superintendent']],
  ['controller', ['controller']],
  ['treasurer', ['treasurer']],
  ['attorney', ['attorney']],
  ['councilmember', ['council']],
  ['councilwoman', ['council']],
  ['councilman', ['council']],
  // The register holds no Speaker as such; Robert Rivas is filed as a State
  // Assembly Member. Mapping this to the Assembly would hand "Speaker Johnson",
  // the U.S. House Speaker, to Assemblymember Natasha Johnson.
  ['speaker', ['speaker']],
  ['ceo', ['chief executive']],
  ['minister', ['minister']],
  ['premier', ['premier', 'prime minister']],
  ['emir', ['emir']],
  ['director-general', ['director-general']],
  ['ambassador', ['ambassador']],
]);

/** Two-word titles that mean something different from their last word. */
function compoundTitle(first: string, second: string) {
  if (second === 'president' && first === 'vice') return ['vice president'];
  if (
    (second === 'gov' || second === 'governor') &&
    (first === 'lt' || first === 'lieutenant')
  )
    return ['lieutenant governor'];
  if ((second === 'sen' || second === 'senator') && first === 'state')
    return ['state senator'];
  if ((second === 'sen' || second === 'senator') && first === 'us')
    return ['u.s. senator'];
  if (second === 'general' && first === 'attorney') return ['attorney general'];
  if (second === 'justice' && first === 'chief') return ['chief justice'];
  if (second === 'lady' && first === 'first') return ['first lady'];
  return null;
}

/**
 * California bill authors, as the governor's releases print them: "SB 886
 * (Padilla and McNerney)", "AB 1577 (Bauer-Kahan)". The house of the bill says
 * which chamber the names in the parentheses sit in, which is how "Padilla"
 * there is the state senator and not the U.S. senator of the same surname.
 */
const BILL_AUTHORS =
  /\b(?:(AB|ACA|AJR|ACR|SB|SCA|SJR|SCR)|(Assembly|Senate) (?:Bill|Constitutional Amendment|Joint Resolution|Concurrent Resolution)) ?\d+\s*\(([^()]{1,120})\)/g;

function billAuthorSpans(text: string) {
  const spans: { start: number; end: number; offices: string[] }[] = [];
  for (const match of text.matchAll(BILL_AUTHORS)) {
    const house = (match[1] || match[2])[0];
    const end = (match.index ?? 0) + match[0].length - 1;
    spans.push({
      start: end - match[3].length,
      end,
      offices: house === 'A' ? ['assembly'] : ['state senator'],
    });
  }
  return spans;
}

/**
 * The office the words in front of a surname name, if they name one. Only a
 * single space counts as adjacency, as everywhere else in this module.
 */
function titleBefore(
  text: string,
  at: number,
  bills: ReturnType<typeof billAuthorSpans>,
) {
  const bill = bills.find((span) => at >= span.start && at < span.end);
  if (bill) return bill.offices;
  const last = tokenBefore(text, at);
  if (!last) return null;
  const second = tokenKey(last);
  const first = tokenKey(tokenBefore(text, at - 1 - last.length));
  return compoundTitle(first, second) || TITLES.get(second) || null;
}

const holds = (office: string | null | undefined, words: string[]) => {
  const held = normalizePunctuation(office || '').toLowerCase();
  return words.some((word) => held.includes(word));
};

/**
 * Whether a word opens its sentence. A capitalised surname there might just be
 * a word: "Price caps take effect" is not Pamela Price.
 */
function sentenceInitial(text: string, at: number) {
  let i = at - 1;
  while (i >= 0 && /[\s"“'‘([]/.test(text[i])) i -= 1;
  return i < 0 || /[.!?:;]/.test(text[i]);
}

export type Span = { start: number; end: number };

export type Mention<T> = {
  row: T;
  /** 100 named in full, 75 by title and surname, 50 by surname alone. */
  score: number;
  /** Offset of the first mention, which is how prominent the person is. */
  at: number;
  /**
   * Every place in `text` the story refers to this person that the rules
   * accept: each full name, each titled surname, and each bare surname that
   * nothing beside it gives to someone else. Offsets are into the caller's
   * text, which is how a page can put the person's card on the right words.
   */
  spans: Span[];
};

/** Keep the longest of any overlapping spans, in reading order. */
function tidySpans(spans: Span[]) {
  const sorted = [...spans].sort(
    (a, b) => a.start - b.start || b.end - b.start - (a.end - a.start),
  );
  const kept: Span[] = [];
  for (const span of sorted) {
    const last = kept[kept.length - 1];
    if (last && span.start < last.end) continue;
    kept.push(span);
  }
  return kept;
}

/**
 * The people a story names, most prominent first.
 *
 * A full name always counts. A surname counts when a title or a bill number in
 * front of it points at exactly one person who carries it ("Secretary Rubio",
 * "SB 886 (Padilla)"), or, with no title, when exactly one person in the
 * register carries it, it is written with a capital, and nothing beside it
 * shows it belongs to somebody else. Lower-case "price" is a word, not Pamela
 * Price, and a capitalised "Price" opening a sentence counts only if the story
 * never uses the word in lower case.
 *
 * Several people sharing a full name are settled by the story's own words, or
 * not at all (see disambiguateSameName).
 *
 * The order is where each person is first named, because the rail shows four
 * and the homepage shows one: the person in the headline belongs in front of
 * the co-author in paragraph six. Alphabetical order used to decide it, which
 * kept Buffy Wicks and Dawn Addis on a story whose lead author, Rebecca
 * Bauer-Kahan, was cut.
 *
 * `rows` should include people without a portrait; they still count as
 * carriers of a surname. The caller drops them afterwards.
 */
export function matchPeople<T extends NameCandidate>(
  text: string,
  rows: T[],
): Mention<T>[] {
  const original = normalizePunctuation(` ${text} `);
  const lower = foldAccents(original.toLowerCase());
  const bills = billAuthorSpans(original);

  // One mention per person, however many of their names the story uses.
  const hits: Mention<T>[] = [];
  const found = new Map<T, Mention<T>>();
  for (const row of rows) {
    const spans = fullForms(row).flatMap((form) =>
      [...wholeWordOffsets(lower, form)].map((at) => ({
        start: at,
        end: at + needle(form).length,
      })),
    );
    if (!spans.length) continue;
    const hit = {
      row,
      score: 100,
      at: Math.min(...spans.map((span) => span.start)),
      spans,
    };
    hits.push(hit);
    found.set(row, hit);
  }

  const carriers = new Map<string, T[]>();
  for (const row of rows)
    for (const surname of surnamesOf(row)) {
      const group = carriers.get(surname);
      if (group) group.push(row);
      else carriers.set(surname, [row]);
    }

  for (const [surname, group] of carriers) {
    if (surname.length <= 3) continue;
    const offsets = [...wholeWordOffsets(lower, surname)];
    if (!offsets.length) continue;
    const usedAsWord = offsets.some((at) => !startsCapital(original.slice(at)));
    const outsiders = group.map((row) =>
      outsiderTest(row.name, row.aliases || []),
    );
    const titled = new Map<T, number[]>();
    const against = new Set<T>();
    const plain: number[] = [];

    for (const at of offsets) {
      if (!startsCapital(original.slice(at))) continue;
      const title = titleBefore(original, at, bills);
      if (title) {
        // A title settles it without the neighbour check, which would read the
        // capitalised verb of a headline ("President Trump Proclaims") as
        // someone else's name.
        const fits = group.filter((row) => holds(row.office, title));
        for (const row of group) if (!fits.includes(row)) against.add(row);
        if (fits.length === 1)
          titled.set(fits[0], [...(titled.get(fits[0]) || []), at]);
        continue;
      }
      const before = neighbourBefore(original, at);
      const after = tokenAfter(original, at + surname.length);
      let flanked = false;
      group.forEach((row, index) => {
        if (outsiders[index](before) || outsiders[index](after)) {
          against.add(row);
          flanked = true;
        }
      });
      if (flanked || (usedAsWord && sentenceInitial(original, at))) continue;
      plain.push(at);
    }

    const toSpans = (starts: number[]) =>
      starts.map((at) => ({ start: at, end: at + needle(surname).length }));
    const credit = (row: T, score: number, at: number, spans: Span[]) => {
      const earlier = found.get(row);
      if (!earlier) {
        const hit = { row, score, at, spans };
        hits.push(hit);
        found.set(row, hit);
        return;
      }
      earlier.score = Math.max(earlier.score, score);
      earlier.at = Math.min(earlier.at, at);
      earlier.spans.push(...spans);
    };
    for (const row of group) {
      const titledAt = titled.get(row) || [];
      // A bare surname can only ever be linked to the one person who carries it.
      const plainAt = group.length === 1 ? plain : [];
      const existing = found.get(row);
      if (existing?.score === 100) {
        // Named in full already: the later "Newsom said" is theirs too.
        existing.spans.push(...toSpans([...titledAt, ...plainAt]));
      } else if (titledAt.length)
        credit(row, 75, titledAt[0], toSpans([...titledAt, ...plainAt]));
      else if (
        plainAt.length &&
        !against.has(row) &&
        (existing ||
          // Wire copy names a foreign leader in full, or by title, before it
          // shortens the name, and a foreign surname alone is too often
          // something else in American copy: "Nielsen ratings", or the other Al
          // Thani in Qatar's government.
          row.level !== 'International')
      )
        credit(row, 50, plainAt[0], toSpans(plainAt));
    }
  }

  // Namesakes share a canonical spelling and matched on it; the story's own
  // words have to settle which of them it means.
  const byName = new Map<string, Mention<T>[]>();
  for (const hit of hits) {
    const key = canonicalName(hit.row.name);
    const group = byName.get(key);
    if (group) group.push(hit);
    else byName.set(key, [hit]);
  }
  const resolved: Mention<T>[] = [];
  for (const group of byName.values()) {
    if (group.length === 1) {
      resolved.push(group[0]);
      continue;
    }
    const pick = disambiguateSameName(
      lower,
      group.map((hit) => hit.row),
    );
    if (pick >= 0) resolved.push(group[pick]);
  }

  // Offsets were found in the padded string; the caller's text starts one
  // character earlier.
  for (const hit of resolved) {
    hit.at -= 1;
    hit.spans = tidySpans(hit.spans).map((span) => ({
      start: span.start - 1,
      end: span.end - 1,
    }));
  }
  return resolved.sort(
    (a, b) =>
      a.at - b.at || b.score - a.score || a.row.name.localeCompare(b.row.name),
  );
}
