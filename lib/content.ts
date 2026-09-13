export type SourceLink = { name: string; url: string };

export type Article = {
  id: string;
  slug: string;
  section: string;
  title: string;
  dek: string;
  body: string[];
  keyPoints: string[];
  author: string;
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  imageUrl: string;
  imageAlt: string;
  imageCredit: string;
  sources: SourceLink[];
  status: 'published' | 'review' | 'draft';
  featured: boolean;
};

export const articles: Article[] = [
  {
    id: 'gcj-001',
    slug: 'ready-before-the-wind-changes',
    section: 'California',
    title: 'Ready before the wind changes',
    dek: 'With heat, low humidity and gusty conditions converging, California is moving crews before the first spark. The strategy reflects a hard-earned shift from reaction to readiness.',
    body: [
      'California emergency officials are positioning crews and equipment closer to seven counties before a stretch of dangerous fire weather, an increasingly familiar move in a state where a few hours can separate a routine response from a fast-moving disaster.',
      'The deployment includes 26 engines, nine water tenders, a helicopter, a bulldozer and roughly 100 personnel. Resources were assigned to Plumas, Tehama, Sierra, Colusa, Shasta, Glenn and Mono counties, according to the Governor’s Office of Emergency Services.',
      'Prepositioning does not predict that a fire will start. It shortens the distance between a first report and a reinforced response. During red-flag conditions, when wind and dry fuels can accelerate a new ignition, that time matters.',
      'The practical message for residents is simpler: official alerts and county evacuation maps remain the authoritative source for immediate instructions. The Journal will keep this report current as conditions and deployments change.',
    ],
    keyPoints: ['Seven counties are receiving additional resources.', 'The state deployment includes 26 engines and roughly 100 personnel.', 'Residents should rely on county alerts for evacuation instructions.'],
    author: 'Golden Coast Journal Desk',
    publishedAt: '2026-09-13T15:28:00.000Z',
    updatedAt: '2026-09-13T16:28:00.000Z',
    readingMinutes: 5,
    imageUrl: '/california-coast.jpg',
    imageAlt: 'Aerial view of a California coastal city meeting the Pacific Ocean',
    imageCredit: 'Clayton Cardinalli / Unsplash',
    sources: [{ name: 'California Governor’s Office of Emergency Services', url: 'https://www.news.caloes.ca.gov/california-approves-firefighting-resources-to-seven-counties-ahead-of-red-flag-warnings/' }],
    status: 'published',
    featured: true,
  },
  {
    id: 'gcj-002',
    slug: 'sites-reservoir-revised-draft',
    section: 'Climate',
    title: 'The long argument over Sites Reservoir enters a consequential new phase',
    dek: 'A revised draft permit attempts to balance a major new water supply with river flows, water quality and senior rights.',
    body: [
      'A revised state draft decision has moved the proposed Sites Reservoir into a new round of public scrutiny, sharpening a debate that has followed the project for years: how much water California can store without weakening the river system that supplies it.',
      'The off-stream reservoir would hold as much as 1.5 million acre-feet and divert Sacramento River water during higher-flow periods. Supporters describe it as a flexible reserve for farms, cities and environmental needs. The revised documents add conditions intended to protect water quality, fisheries and senior water-right holders.',
      'Because the release remains a draft, it is not a final construction approval. The public process and other state and federal reviews continue. The most important questions now concern when diversions would occur, how environmental safeguards would be measured and who bears the long-term cost.',
    ],
    keyPoints: ['The proposal remains under review.', 'The planned reservoir would store up to 1.5 million acre-feet.', 'Revised conditions address river flows, water quality and senior rights.'],
    author: 'Golden Coast Journal Climate Desk',
    publishedAt: '2026-09-12T17:10:00.000Z',
    updatedAt: '2026-09-12T17:10:00.000Z',
    readingMinutes: 6,
    imageUrl: '/oroville.jpg',
    imageAlt: 'Lake Oroville and surrounding California foothills seen from the air',
    imageCredit: 'Florence Low / California Department of Water Resources',
    sources: [{ name: 'California State Water Resources Control Board', url: 'https://waterboards.ca.gov/press_room/press_releases/2026/pr20260903-state-water-board-revises-draft-water-right-decision-for-proposed-sites-reservoir.html' }],
    status: 'published',
    featured: true,
  },
  {
    id: 'gcj-003',
    slug: 'california-ai-audit-rules',
    section: 'Technology',
    title: 'California’s new AI rules put audits and independent review at center stage',
    dek: 'The first-in-the-nation framework will test whether transparency requirements can keep pace with fast-moving models.',
    body: [
      'California has signed a pair of artificial-intelligence measures built around a familiar regulatory idea: consequential systems should be examined by people who did not build them.',
      'The measures establish standards for third-party audits and independent assessments. Their significance will depend on implementation — which systems qualify, how auditors demonstrate independence and what information reaches the public.',
      'For companies, the framework adds a new compliance layer in the country’s largest technology market. For residents, its value will be measured by whether failures become easier to identify before they cause harm.',
    ],
    keyPoints: ['Independent assessments are a central requirement.', 'Implementation details will determine the rules’ reach.', 'The framework could influence standards outside California.'],
    author: 'Golden Coast Journal Technology Desk',
    publishedAt: '2026-09-11T19:45:00.000Z',
    updatedAt: '2026-09-11T21:02:00.000Z',
    readingMinutes: 4,
    imageUrl: '/ai-safeguards.png',
    imageAlt: 'Graphic announcing California artificial intelligence safeguards',
    imageCredit: 'Office of the Governor of California',
    sources: [{ name: 'Office of Governor Gavin Newsom', url: 'https://www.gov.ca.gov/newsroom/' }],
    status: 'published',
    featured: true,
  },
  {
    id: 'gcj-004',
    slug: 'what-electric-reliability-measures',
    section: 'Business',
    title: 'What California means when it says the grid is reliable',
    dek: 'Outage minutes, system demand and local equipment failures answer different questions. Here is how to read the numbers.',
    body: [
      'Electric reliability is often presented as a single score. In practice, regulators track several measures, and each describes a different part of the system.',
      'System-wide supply asks whether enough electricity is available when demand peaks. Distribution reliability tracks interruptions closer to homes and businesses. Public-safety shutoffs, storm damage and equipment failures can therefore move the figures in different directions.',
      'The distinction matters when comparing utility performance or evaluating a proposed investment. A statewide reserve margin cannot explain a neighborhood outage, while a local outage count does not by itself indicate a shortage of generation.',
    ],
    keyPoints: ['Grid supply and neighborhood service are separate measures.', 'Outage duration and frequency reveal different problems.', 'Comparable reporting is essential for accountability.'],
    author: 'Golden Coast Journal Data Desk',
    publishedAt: '2026-09-10T15:30:00.000Z',
    updatedAt: '2026-09-10T15:30:00.000Z',
    readingMinutes: 5,
    imageUrl: '/california-coast.jpg',
    imageAlt: 'Aerial view of a developed California coastline',
    imageCredit: 'Clayton Cardinalli / Unsplash',
    sources: [{ name: 'California Public Utilities Commission', url: 'https://www.cpuc.ca.gov/news-and-updates/all-news' }],
    status: 'published',
    featured: false,
  },
  {
    id: 'gcj-005',
    slug: 'california-unemployment-august-brief',
    section: 'Economy',
    title: 'California labor market shows improvement, with pressure still uneven',
    dek: 'The statewide unemployment rate improved to 5.1 percent, but a single headline number cannot describe every region or industry.',
    body: [
      'California’s unemployment rate improved to 5.1 percent in the state’s latest release, offering a broad signal of a labor market moving in the right direction.',
      'The statewide number is useful, but incomplete. Hiring conditions vary substantially by region and industry, and a declining rate can reflect changes in both employment and labor-force participation.',
      'The next useful comparison will be revised payroll estimates and county-level data, which can show whether gains are broad or concentrated in a smaller set of sectors.',
    ],
    keyPoints: ['The reported statewide rate improved to 5.1 percent.', 'Regional and industry data can diverge from the headline.', 'Future revisions may change the initial picture.'],
    author: 'Golden Coast Journal Economy Desk',
    publishedAt: '2026-09-09T16:00:00.000Z',
    updatedAt: '2026-09-09T16:00:00.000Z',
    readingMinutes: 3,
    imageUrl: '/california-coast.jpg',
    imageAlt: 'Businesses and homes along the California coast',
    imageCredit: 'Clayton Cardinalli / Unsplash',
    sources: [{ name: 'California Employment Development Department', url: 'https://edd.ca.gov/en/newsroom/' }],
    status: 'published',
    featured: false,
  },
  {
    id: 'gcj-006',
    slug: 'oroville-summer-operations-explained',
    section: 'California',
    title: 'Lake Oroville shifts into late-summer operations',
    dek: 'Water managers are balancing supply, environmental releases and recreation as the season turns.',
    body: [
      'Lake Oroville has moved into its late-summer operating pattern, when managers balance stored supply with downstream environmental requirements and statewide deliveries.',
      'Weekly updates from the Department of Water Resources provide the clearest snapshot of reservoir elevation, releases, recreation access and construction activity. Those figures can move quickly and should be read with their publication date in view.',
      'Oroville is one component of a larger system. Its level alone does not describe statewide drought conditions or the status of every local water agency.',
    ],
    keyPoints: ['Weekly figures are a snapshot, not a season-long forecast.', 'Releases serve multiple operational and environmental purposes.', 'One reservoir does not define statewide water conditions.'],
    author: 'Golden Coast Journal Desk',
    publishedAt: '2026-09-08T14:12:00.000Z',
    updatedAt: '2026-09-08T14:12:00.000Z',
    readingMinutes: 4,
    imageUrl: '/oroville.jpg',
    imageAlt: 'Lake Oroville and the surrounding foothills',
    imageCredit: 'Florence Low / California Department of Water Resources',
    sources: [{ name: 'California Department of Water Resources', url: 'https://water.ca.gov/' }],
    status: 'published',
    featured: false,
  },
];

export const sections = ['California', 'Nation', 'World', 'Business', 'Technology', 'Climate', 'Culture', 'Ideas'];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function getSectionArticles(section: string) {
  return articles.filter((article) => article.section.toLowerCase() === section.toLowerCase());
}

export function formatArticleDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' }).format(new Date(value));
}
