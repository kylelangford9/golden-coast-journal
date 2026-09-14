import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFile(path.join(root, file), 'utf8');

const [
  data,
  page,
  guide,
  link,
  pollData,
  homepage,
  deadlines,
  propositions,
  header,
  footer,
  sitemap,
  newsletter,
] = await Promise.all([
  read('lib/california-candidates.ts'),
  read('app/california-candidates-2026/page.tsx'),
  read('components/candidate-guide.tsx'),
  read('components/candidate-guide-link.tsx'),
  read('lib/polls.ts'),
  read('app/page.tsx'),
  read('app/california-deadlines/page.tsx'),
  read('components/proposition-guide.tsx'),
  read('components/site-header.tsx'),
  read('components/site-footer.tsx'),
  read('app/sitemap.ts'),
  read('components/newsletter-form.tsx'),
]);

const offices = [
  'Governor',
  'Lieutenant Governor',
  'Secretary of State',
  'Controller',
  'Treasurer',
  'Attorney General',
  'Insurance Commissioner',
  'Superintendent of Public Instruction',
  'Board of Equalization',
];
for (const office of offices) {
  assert.ok(data.includes(`name: '${office}'`), `missing office ${office}`);
}

const candidates = [
  'Xavier Becerra',
  'Steve Hilton',
  'Fiona Ma',
  'Gloria Romero',
  'Donald P. (Don) Wagner',
  'Shirley N. Weber',
  'Malia M. Cohen',
  'Herb W Morgan',
  'Jennifer Hawks',
  'Eleni Kounalakis',
  'Rob Bonta',
  'Michael E. Gates',
  'Ben Allen',
  'Jane Kim',
  'Richard Barrera',
  'Sonja Shaw',
  'Nelson Esparza',
  'Shannon Grove',
  'Sally J. Lieber',
  'John Pimentel',
  'Mike Gipson',
  'Samuel P. Sukaton',
  'Denis Bilodeau',
  'Tom Umberg',
];
assert.equal(
  (data.match(/statementAvailable: (?:true|false)/g) || []).length,
  24,
);
for (const candidate of candidates) {
  assert.ok(
    data.includes(`name: '${candidate}'`),
    `missing candidate ${candidate}`,
  );
}
assert.equal((data.match(/statementAvailable: false/g) || []).length, 4);
assert.equal((data.match(/district: [1-4]/g) || []).length, 8);
assert.equal(
  (data.match(/https:\/\/voterguide\.sos\.ca\.gov\/candidates\//g) || [])
    .length,
  9,
);

assert.match(page, /canonical: '\/california-candidates-2026'/);
assert.match(page, /CollectionPage/);
assert.match(page, /ItemList/);
assert.match(page, /Sources and references/);
assert.match(page, /NewsletterForm placement="candidates"/);
assert.match(
  page,
  /ReaderPulse pollId="candidate-office-explainer-priority-2026"/,
);
assert.match(page, /does not endorse candidates/);
assert.match(page, /not checked for\s+accuracy by an official agency/);

for (const eventName of [
  'candidate_guide_opened',
  'candidate_search_started',
  'candidate_office_filter_selected',
  'candidate_office_reviewed',
  'candidate_checklist_cleared',
  'candidate_official_source_opened',
  'candidate_ballot_tool_selected',
  'candidate_newsletter_selected',
  'candidate_proposition_guide_selected',
  'candidate_deadline_guide_selected',
]) {
  assert.ok(guide.includes(eventName), `missing metric ${eventName}`);
}
assert.match(guide, /window\.localStorage/);
assert.match(
  guide,
  /californiavoters\.live\/\?utm_source=golden_coast_journal/,
);
assert.doesNotMatch(
  guide,
  /candidate_name|party_preference|vote_choice|email/i,
);
assert.doesNotMatch(
  guide,
  /office: officeId[\s\S]{0,250}candidate_office_reviewed/,
);

assert.match(link, /candidate_guide_selected/);
assert.match(pollData, /candidate-office-explainer-priority-2026/);
assert.match(homepage, /CandidateGuideLink placement="homepage"/);
assert.match(deadlines, /CandidateGuideLink placement="deadlines"/);
assert.match(propositions, /CandidateGuideLink placement="propositions"/);
assert.match(header, /2026 Candidates/);
assert.match(footer, /href="\/california-candidates-2026"/);
assert.match(sitemap, /'\/california-candidates-2026'/);
assert.match(newsletter, /'candidates'/);

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
  'California candidate facts, source boundaries, privacy and metrics checks passed.',
);
