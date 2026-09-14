import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), 'utf8');

const [
  data,
  page,
  guide,
  pollData,
  homepage,
  articlePage,
  header,
  footer,
  sitemap,
  newsletter,
  detailPage,
] = await Promise.all([
  read('lib/california-propositions.ts'),
  read('app/california-propositions-2026/page.tsx'),
  read('components/proposition-guide.tsx'),
  read('lib/polls.ts'),
  read('app/page.tsx'),
  read('app/article/[slug]/page.tsx'),
  read('components/site-header.tsx'),
  read('components/site-footer.tsx'),
  read('app/sitemap.ts'),
  read('components/newsletter-form.tsx'),
  read('app/california-propositions-2026/[number]/page.tsx'),
]);

const propositionNumbers = [1, 2, 3, 4, 5, 37, 38, 39, 40, 41, 42, 43, 44, 45];
assert.equal((data.match(/\n\s+number: \d+,/g) || []).length, 14);
for (const number of propositionNumbers) {
  assert.ok(
    data.includes(`number: ${number},`),
    `missing Proposition ${number}`,
  );
  assert.ok(
    data.includes(`https://voterguide.sos.ca.gov/propositions/${number}/`),
    `missing official source for Proposition ${number}`,
  );
}

for (const fact of [
  '$11.25 billion',
  '$5 billion to $15 billion',
  '$25 billion',
  '$8.4 billion',
  'assets over $1 billion',
  'two-thirds',
  'at least 90%',
  'could exceed $100 million annually',
]) {
  assert.ok(data.includes(fact), `missing verified fact: ${fact}`);
}

assert.match(page, /canonical: '\/california-propositions-2026'/);
assert.match(page, /CollectionPage/);
assert.match(page, /ItemList/);
assert.match(page, /Sources and references/);
assert.match(page, /NewsletterForm placement="propositions"/);
assert.match(page, /ReaderPulse pollId="proposition-explainer-priority-2026"/);
assert.match(page, /does not make endorsements/);

for (const eventName of [
  'proposition_guide_opened',
  'proposition_search_started',
  'proposition_filter_selected',
  'proposition_detail_opened',
  'proposition_reviewed',
  'proposition_official_source_opened',
  'proposition_newsletter_selected',
]) {
  assert.ok(guide.includes(eventName), `missing metric ${eventName}`);
}
assert.match(guide, /window\.localStorage/);
assert.doesNotMatch(guide, /vote_choice|yes_choice|no_choice|email|address/i);
assert.doesNotMatch(
  guide,
  /proposition_number: number[\s\S]{0,250}proposition_reviewed/,
);

assert.match(pollData, /proposition-explainer-priority-2026/);
assert.match(homepage, /PropositionGuideLink placement="homepage"/);
assert.match(articlePage, /PropositionGuideLink placement="article"/);
assert.match(header, /2026 Propositions/);
assert.match(footer, /href="\/california-propositions-2026"/);
assert.match(sitemap, /url: `\$\{origin\}\/california-propositions-2026`/);
assert.match(sitemap, /californiaPropositions\.map/);
assert.match(
  sitemap,
  /california-propositions-2026\/\$\{proposition\.number\}/,
);
assert.match(newsletter, /'propositions'/);

assert.match(detailPage, /generateStaticParams/);
assert.match(detailPage, /dynamicParams = false/);
assert.match(
  detailPage,
  /California Proposition \$\{proposition\.number\} 2026/,
);
assert.match(detailPage, /alternates: \{ canonical: path \}/);
assert.match(detailPage, /'@type': 'Article'/);
assert.match(detailPage, /'@type': 'BreadcrumbList'/);
assert.match(
  detailPage,
  /By <Link href="\/authors\/kyle-langford">Kyle Langford/,
);
assert.match(
  detailPage,
  /data-growth-event="proposition_official_source_opened"/,
);
assert.match(
  detailPage,
  /ReaderPulse pollId="proposition-explainer-priority-2026" compact/,
);
assert.match(detailPage, /NewsletterForm placement="propositions"/);
assert.match(guide, /Full Journal explainer/);
assert.match(guide, /california-propositions-2026\/\$\{proposition\.number\}/);

async function sourceFiles(directory) {
  const entries = await readdir(path.join(root, directory), {
    withFileTypes: true,
  });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await sourceFiles(relative)));
    else if (/\.(?:ts|tsx)$/.test(entry.name)) files.push(relative);
  }
  return files;
}

for (const file of [
  ...(await sourceFiles('app')),
  ...(await sourceFiles('components')),
  ...(await sourceFiles('lib')),
]) {
  assert.doesNotMatch(await read(file), /—/, `${file} contains an em dash`);
}

console.log(
  'California proposition facts, neutrality, sources, privacy and metrics checks passed.',
);
