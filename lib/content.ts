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

const pageEnhancementUpdates: Record<string, string> = {
  'california-2026-general-election-deadlines':
    '2026-09-14T02:52:00-07:00',
};

export function effectiveArticleUpdatedAt(article: Article) {
  const enhancement = pageEnhancementUpdates[article.slug];
  if (!enhancement) return article.updatedAt;
  return Date.parse(enhancement) > Date.parse(article.updatedAt)
    ? enhancement
    : article.updatedAt;
}

export const articles: Article[] = [
  {
    id: 'gcj-011',
    slug: 'california-tax-extension-deadline-2026-october-15',
    section: 'Business',
    title:
      'California tax extension deadline 2026; what is due October 15',
    dek: 'Most individual extension filers have until October 15 to submit their 2025 state and federal returns. The filing extension did not move the April payment deadline, and the California and federal rules are not identical.',
    body: [
      'October 15 is the 2026 filing deadline for most individuals using an extension on a 2025 California or federal income-tax return. It is a filing date, not a new payment date; the state and federal paths into the extension work differently.',
      'California gives individual taxpayers an automatic extension through October 15. No state extension application is required. The Franchise Tax Board says a 2025 return should be filed or e-filed by that date to avoid a late-filing penalty, with interest calculated from the original April 15 due date when tax remains unpaid.',
      'The federal rule has an extra condition. Most individual taxpayers needed to request a federal extension by April 15, generally through Form 4868 or an accepted electronic method, to make an October 15 federal filing timely. A person who did not obtain that extension should not treat October 15 as a new federal deadline; the IRS advises taxpayers who are already late to file and pay as soon as possible.',
      'Neither extension created six more months to pay. California and federal balances were generally due April 15, 2026. Filing now does not make a late payment timely. Both agencies say unpaid balances can continue to accrue interest and penalties, and both offer payment-plan options for eligible taxpayers who cannot pay in full.',
      'The useful check is straightforward. Confirm that the return covers tax year 2025, verify that the federal extension was accepted if one was required, file both returns by the applicable deadline and keep the electronic acceptance records. If an e-file submission is rejected, correct and retransmit it promptly.',
      'Free filing remains available for some taxpayers. The IRS says its guided Free File service is available for 2025 adjusted gross income of $89,000 or less, while Free File Fillable Forms are available regardless of income for people comfortable preparing their own return. California offers CalFile and lists other state filing options through the Franchise Tax Board.',
      'Some taxpayers have different dates, including certain people outside the United States, members of the military serving in qualifying areas and people covered by disaster-related relief. Those exceptions are specific. Check the notice or rule that applies to the individual return rather than assuming the ordinary October 15 date controls. This article provides general deadline information, not individualized tax advice.',
    ],
    keyPoints: [
      'California automatically extends the deadline to file a 2025 individual return to October 15, 2026; no state application is required.',
      'Most federal filers needed to request their extension by April 15 for an October 15 federal return to be timely.',
      'The ordinary payment deadline remained April 15, so unpaid balances may continue to generate interest and penalties.',
    ],
    author: 'Kyle Langford',
    publishedAt: '2026-09-14T04:05:00-07:00',
    updatedAt: '2026-09-14T04:05:00-07:00',
    readingMinutes: 3,
    imageUrl:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/CA_State_Capitol.png/1920px-CA_State_Capitol.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    imageAlt: 'California State Capitol in Sacramento beneath a clear blue sky',
    imageCredit: 'Earthquakesurprise / Wikimedia Commons (CC0)',
    sources: [
      {
        name: 'California Franchise Tax Board: Personal filing due dates',
        url: 'https://www.ftb.ca.gov/file/when-to-file/due-dates-personal.html',
      },
      {
        name: 'California Franchise Tax Board: 2025 Form 540 instructions',
        url: 'https://www.ftb.ca.gov/forms/2025/2025-540-booklet.html',
      },
      {
        name: 'California Franchise Tax Board: Payment plans',
        url: 'https://www.ftb.ca.gov/pay/payment-plans/index.asp',
      },
      {
        name: 'Internal Revenue Service: Requesting an extension',
        url: 'https://www.irs.gov/newsroom/if-you-need-more-time-to-file-request-an-extension',
      },
      {
        name: 'Internal Revenue Service: Free filing options for extension filers',
        url: 'https://www.irs.gov/newsroom/dont-delay-filing-any-longer-several-free-filing-options-still-available',
      },
      {
        name: 'Internal Revenue Service: Payment plans and installment agreements',
        url: 'https://www.irs.gov/payments/payment-plans-installment-agreements',
      },
    ],
    status: 'published',
    featured: true,
  },
  {
    id: 'gcj-010',
    slug: 'track-california-mail-ballot-2026-fix-problems',
    section: 'California',
    title:
      'How to track your California mail ballot in 2026; and fix a problem',
    dek: 'Where’s My Ballot provides automatic status notices in all 58 counties. A separate state page shows whether a ballot was counted, while replacement and signature-cure options address the most common problems.',
    body: [
      'California voters do not have to wait until the final canvass to learn what happened to a vote-by-mail ballot. The state’s Where’s My Ballot service can send email, text or voice notifications as the ballot moves through the process, and enrollment is available in all 58 counties.',
      'The notices cover more than delivery. According to the Secretary of State, voters can be notified when a ballot is mailed, when it is expected to arrive, when the county receives the completed ballot and whether it was accepted. If a county cannot accept it, the notice can include the reason and instructions for correcting the problem.',
      'Voters can also use My Voter Status or their county’s ballot-status system to verify whether a returned ballot arrived and was counted. The state maintains a county-by-county directory with online tools and phone numbers. That direct county record is the place to resolve a status that appears delayed or unclear.',
      'A ballot that never arrives, is lost or is destroyed can be replaced. Only the registered voter may request the replacement, either by submitting the state application or by contacting the county elections office by phone, email, fax or another electronic method. For the November 3 general election, October 27 is the state’s recommended date to submit a replacement-ballot application; a voter facing a later problem should contact the county immediately rather than treating that recommendation as a final cutoff.',
      'Signature problems have a separate remedy. County officials compare the signature on the return envelope with signatures in the voter’s registration record. If the envelope is unsigned or the signature does not compare, the county must notify the voter and provide instructions for completing a verification statement. Procedures vary by county.',
      'For the November 3, 2026, general election, a completed signature-verification statement must reach the county elections office by 5 p.m. on November 25. The Secretary of State’s verification page links to instructions for every county. A voter who receives a warning should use that county-specific process promptly and keep confirmation of the submission when possible.',
      'Ballot tracking is most useful when it is activated before a deadline becomes urgent. Sign up for Where’s My Ballot, keep the county elections office information available and read every status message. The relevant question is not only whether the envelope moved through the mail, but whether the county recorded the ballot as accepted.',
    ],
    keyPoints: [
      'Where’s My Ballot offers email, text or voice status notices in all 58 California counties.',
      'A missing, lost or destroyed ballot can be replaced; October 27 is the recommended application date for the November 3 general election.',
      'For that election, a missing or mismatched signature must be cured by 5 p.m. on November 25.',
    ],
    author: 'Kyle Langford',
    publishedAt: '2026-09-14T02:15:00-07:00',
    updatedAt: '2026-09-14T02:15:00-07:00',
    readingMinutes: 3,
    imageUrl:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/CA_State_Capitol.png/1920px-CA_State_Capitol.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    imageAlt: 'California State Capitol in Sacramento beneath a clear blue sky',
    imageCredit: 'Earthquakesurprise / Wikimedia Commons (CC0)',
    sources: [
      {
        name: 'California Secretary of State: Where’s My Ballot?',
        url: 'https://www.sos.ca.gov/elections/ballot-status/wheres-my-ballot',
      },
      {
        name: 'California Secretary of State: Vote by Mail',
        url: 'https://www.sos.ca.gov/elections/voter-registration/vote-mail',
      },
      {
        name: 'California Secretary of State: Ballot Status',
        url: 'https://www.sos.ca.gov/elections/ballot-status',
      },
      {
        name: 'California Secretary of State: Verify My Signature',
        url: 'https://www.sos.ca.gov/elections/voter-registration/vote-mail/verify-my-signature',
      },
      {
        name: 'California Secretary of State: Election Dates and Resources',
        url: 'https://www.sos.ca.gov/elections/voting-resources/voting-california/election-dates-and-resources',
      },
    ],
    status: 'published',
    featured: true,
  },
  {
    id: 'gcj-009',
    slug: 'california-minimum-wage-2027-rate-exempt-salary',
    section: 'Business',
    title:
      'California minimum wage rises to $17.40 in 2027; what workers and employers should check',
    dek: 'The statewide floor rises 50 cents on January 1. A higher $72,384 salary threshold also becomes part of the test for certain overtime exemptions, while local and industry rules may require more.',
    body: [
      'California’s statewide minimum wage rises from $16.90 to $17.40 an hour on January 1, 2027. The rate applies to most workers, including people paid by the piece, and does not change with an employer’s size.',
      'The statewide number is a floor, not necessarily the final rate for every job. Some cities and counties require a higher local minimum wage, and separate rules cover fast-food workers and certain health-care workers. The practical check is the work location and industry, not only the statewide announcement.',
      'The increase also raises the salary threshold used in certain overtime exemptions. Beginning January 1, an employee must earn at least $72,384 a year to meet the salary portion of an exemption test. Salary alone does not make someone exempt: the employee must also satisfy the duties and other requirements for the specific exemption.',
      'Employers should update payroll for work performed on and after January 1, confirm whether a higher local or industry rate applies, and display both the statewide minimum-wage order and the industry wage order that covers the workplace. California also requires the employee’s wage rate to appear on the pay stub.',
      'Workers can compare their hourly rate, workplace location, industry and pay stub against the applicable rules. California does not allow an employer to count tips toward the state minimum wage, and the same state minimum applies to adults and minors unless a specific exemption controls.',
      'A worker who appears to be underpaid should keep records of hours, pay stubs and the amount received, then raise the issue with the employer. If it is not corrected, the Labor Commissioner’s Office accepts wage claims online, by email, by mail or in person. The agency says workers can file regardless of immigration status.',
      'The useful number is the rate that applies to the particular job. For most California workers that will be at least $17.40 on January 1, but location, industry and job duties can change the answer.',
    ],
    keyPoints: [
      'California’s statewide minimum wage becomes $17.40 an hour on January 1, 2027.',
      'A $72,384 annual salary meets only the salary portion of certain overtime-exemption tests.',
      'Higher local and industry-specific rates can override the statewide floor.',
    ],
    author: 'Kyle Langford',
    publishedAt: '2026-09-14T00:39:54-07:00',
    updatedAt: '2026-09-14T00:39:54-07:00',
    readingMinutes: 3,
    imageUrl:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ea/Worker_inspects_construction.jpg/1280px-Worker_inspects_construction.jpg?utm_campaign=index&utm_content=thumbnail&utm_source=commons.wikimedia.org',
    imageAlt: 'A worker inspecting a construction site',
    imageCredit:
      'Ryan Hagerty / U.S. Fish and Wildlife Service via Wikimedia Commons (public domain)',
    sources: [
      {
        name: 'California Department of Industrial Relations: 2027 minimum wage announcement',
        url: 'https://www.dir.ca.gov/DIRNews/2026/2026-66.html',
      },
      {
        name: 'California Labor Commissioner’s Office: Minimum Wage FAQ',
        url: 'https://www.dir.ca.gov/dlse/faq_minimumwage.htm',
      },
      {
        name: 'California Labor Commissioner’s Office: How to File a Wage Claim',
        url: 'https://www.dir.ca.gov/dlse/HowToFileWageClaim.htm',
      },
    ],
    status: 'published',
    featured: true,
  },
  {
    id: 'gcj-008',
    slug: 'california-climate-credit-2026-amounts-bill',
    section: 'California',
    title:
      'California Climate Credit 2026; the amounts and dates to check on your bill',
    dek: 'PG&E, SCE and SDG&E moved residential electric credits to August and September this year. Smaller utilities use a different schedule, and no application is required.',
    body: [
      'Eligible California households do not need to apply for the 2026 California Climate Credit. Customers of the state’s three largest investor-owned electric utilities should check their August and September bills, although a utility’s billing cycle can push the credit onto the following month’s statement.',
      'PG&E residential customers receive $36.18 in August and another $36.18 in September. Southern California Edison customers receive $36 in each month. San Diego Gas & Electric customers receive $49.36 in each month, according to the California Public Utilities Commission’s current 2026 schedule.',
      'The schedule is different for the state’s smaller investor-owned electric utilities. Bear Valley Electric Service customers are scheduled for $17.52 in April and November, while Pacific Power customers are scheduled for $111.83 in those months. Liberty Utilities customers received $71.98 in April and are listed for the same amount in November, but the commission says that amount may change because a proposed adjustment is still awaiting approval.',
      'The credit appears automatically as “CA Climate Credit” or “California Climate Credit.” It is not based on how much energy a household uses. Eligible residential customers of investor-owned utilities and community choice aggregators receive it through the utility bill rather than through a separate check or application.',
      'A missing credit should be raised with the utility first. The commission advises customers to contact their utility when the expected bill arrives without the line item. Submetered residents who are eligible but do not receive a utility bill directly should receive the credit from their property owner or billing provider.',
      'Natural-gas and small-business credits remain on separate tracks. The 2026 residential gas credit was issued in April: $46.26 for PG&E, $32.58 for SDG&E, $45.57 for Southwest Gas and $36.06 for Southern California Gas. Small-business electric credits continue in April and October.',
      'This is a timing change, not a new benefit. The commission approved moving the large-utility residential electric credits from spring and fall to August and September, when summer electricity bills are typically higher. Beginning in 2027, residential natural-gas credits move from April to February. The practical test is the bill itself; check the named line item, the utility-specific amount and the relevant billing cycle.',
    ],
    keyPoints: [
      'PG&E, SCE and SDG&E residential electric customers receive credits in August and September in 2026.',
      'No application is required; the credit appears as a line item on an eligible customer’s bill.',
      'Smaller electric utilities, natural-gas customers and small businesses follow different schedules.',
    ],
    author: 'Kyle Langford',
    publishedAt: '2026-09-13T23:41:47-07:00',
    updatedAt: '2026-09-13T23:41:47-07:00',
    readingMinutes: 3,
    imageUrl:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Path_27_Power_Lines_in_California_0.JPG/1280px-Path_27_Power_Lines_in_California_0.JPG?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail',
    imageAlt:
      'High-voltage power lines running beside Interstate 15 in California',
    imageCredit: 'Northwalker / Wikimedia Commons (CC0)',
    sources: [
      {
        name: 'California Public Utilities Commission: California Climate Credit',
        url: 'https://www.cpuc.ca.gov/climatecredit',
      },
      {
        name: 'California Public Utilities Commission: Climate Credit fact sheet',
        url: 'https://www.cpuc.ca.gov/-/media/cpuc-website/industries-and-topics/documents/natural-gas-and-oil-pipeline-regulation/climate-credit/fact-sheet-climate-credit.pdf',
      },
      {
        name: 'California Public Utilities Commission: Climate Credit FAQ',
        url: 'https://www.cpuc.ca.gov/industries-and-topics/natural-gas/greenhouse-gas-cap-and-trade-program/california-climate-credit/california-climate-credit---faq',
      },
    ],
    status: 'published',
    featured: true,
  },
  {
    id: 'gcj-007',
    slug: 'california-2026-general-election-deadlines',
    section: 'California',
    title:
      'California’s 2026 general election calendar; the deadlines voters need',
    dek: 'Ballots begin moving in early October. Registration closes October 19, but California’s same-day process provides a second path through Election Day.',
    body: [
      'California’s November 3 general election is entering the part of the calendar where dates matter. The state voter guide begins arriving in late September, ballots follow in early October and the standard registration deadline lands 15 days before Election Day.',
      'County election officials must begin mailing vote-by-mail ballots to active registered voters no later than October 5. Early voting also begins that day, and counties must open ballot drop-off locations by October 6, according to the Secretary of State’s election calendar.',
      'October 19 is the last day to register online or have a paper registration postmarked under the ordinary process. Missing that date does not end a voter’s options. Conditional voter registration is available from October 20 through November 3 at county election offices and voting locations.',
      'The first vote centers in counties operating under the Voter’s Choice Act open October 24. Other in-person options vary by county, so a voter should confirm the location and hours through the state’s early-voting directory or the local county elections office before traveling.',
      'Mailed ballots must be postmarked on or before November 3 and received by the county elections office no later than November 10. The Secretary of State advises voters returning a ballot close to Election Day to use an official drop box, voting location or county elections office if timely mail processing is uncertain.',
      'A returned ballot can also be tracked. California’s Where’s My Ballot service provides email, text or voice notifications, while My Voter Status shows registration and ballot information. Those state tools are the authoritative place to verify an individual record.',
      'Election-night totals are not final results. Counties begin reporting after polls close at 8 p.m. on November 3, then continue verification and canvassing. County officials have until December 3 to certify their results, and the Secretary of State’s certified Statement of Vote is scheduled for December 11.',
    ],
    keyPoints: [
      'Counties begin mailing vote-by-mail ballots no later than October 5.',
      'The standard registration deadline is October 19; conditional registration runs October 20 through November 3.',
      'Mailed ballots must be postmarked by November 3 and received no later than November 10.',
    ],
    author: 'Kyle Langford',
    publishedAt: '2026-09-13T22:14:00-07:00',
    updatedAt: '2026-09-14T02:52:00-07:00',
    readingMinutes: 3,
    imageUrl:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7e/CA_State_Capitol.png/1920px-CA_State_Capitol.png?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',
    imageAlt: 'California State Capitol in Sacramento beneath a clear blue sky',
    imageCredit: 'Earthquakesurprise / Wikimedia Commons (CC0)',
    sources: [
      {
        name: 'California Secretary of State: General Election Key Dates and Deadlines',
        url: 'https://www.sos.ca.gov/elections/upcoming-elections/general-election-november-3-2026/key-dates-deadlines',
      },
      {
        name: 'California Secretary of State: Election Dates and Resources',
        url: 'https://www.sos.ca.gov/elections/voting-resources/voting-california/election-dates-and-resources',
      },
      {
        name: 'California Secretary of State: Vote by Mail',
        url: 'https://www.sos.ca.gov/elections/voter-registration/vote-mail',
      },
    ],
    status: 'published',
    featured: true,
  },
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
    keyPoints: [
      'Seven counties are receiving additional resources.',
      'The state deployment includes 26 engines and roughly 100 personnel.',
      'Residents should rely on county alerts for evacuation instructions.',
    ],
    author: 'Golden Coast Journal Desk',
    publishedAt: '2026-09-13T15:28:00.000Z',
    updatedAt: '2026-09-13T16:28:00.000Z',
    readingMinutes: 5,
    imageUrl: '/california-coast.jpg',
    imageAlt:
      'Aerial view of a California coastal city meeting the Pacific Ocean',
    imageCredit: 'Clayton Cardinalli / Unsplash',
    sources: [
      {
        name: 'California Governor’s Office of Emergency Services',
        url: 'https://www.news.caloes.ca.gov/california-approves-firefighting-resources-to-seven-counties-ahead-of-red-flag-warnings/',
      },
    ],
    status: 'published',
    featured: true,
  },
  {
    id: 'gcj-002',
    slug: 'sites-reservoir-revised-draft',
    section: 'Climate',
    title:
      'The long argument over Sites Reservoir enters a consequential new phase',
    dek: 'A revised draft permit attempts to balance a major new water supply with river flows, water quality and senior rights.',
    body: [
      'A revised state draft decision has moved the proposed Sites Reservoir into a new round of public scrutiny, sharpening a debate that has followed the project for years: how much water California can store without weakening the river system that supplies it.',
      'The off-stream reservoir would hold as much as 1.5 million acre-feet and divert Sacramento River water during higher-flow periods. Supporters describe it as a flexible reserve for farms, cities and environmental needs. The revised documents add conditions intended to protect water quality, fisheries and senior water-right holders.',
      'Because the release remains a draft, it is not a final construction approval. The public process and other state and federal reviews continue. The most important questions now concern when diversions would occur, how environmental safeguards would be measured and who bears the long-term cost.',
    ],
    keyPoints: [
      'The proposal remains under review.',
      'The planned reservoir would store up to 1.5 million acre-feet.',
      'Revised conditions address river flows, water quality and senior rights.',
    ],
    author: 'Golden Coast Journal Climate Desk',
    publishedAt: '2026-09-12T17:10:00.000Z',
    updatedAt: '2026-09-12T17:10:00.000Z',
    readingMinutes: 6,
    imageUrl: '/oroville.jpg',
    imageAlt:
      'Lake Oroville and surrounding California foothills seen from the air',
    imageCredit: 'Florence Low / California Department of Water Resources',
    sources: [
      {
        name: 'California State Water Resources Control Board',
        url: 'https://waterboards.ca.gov/press_room/press_releases/2026/pr20260903-state-water-board-revises-draft-water-right-decision-for-proposed-sites-reservoir.html',
      },
    ],
    status: 'published',
    featured: true,
  },
  {
    id: 'gcj-003',
    slug: 'california-ai-audit-rules',
    section: 'Technology',
    title:
      'California’s new AI rules put audits and independent review at center stage',
    dek: 'The first-in-the-nation framework will test whether transparency requirements can keep pace with fast-moving models.',
    body: [
      'California has signed a pair of artificial-intelligence measures built around a familiar regulatory idea: consequential systems should be examined by people who did not build them.',
      'The measures establish standards for third-party audits and independent assessments. Their significance will depend on implementation: which systems qualify, how auditors demonstrate independence and what information reaches the public.',
      'For companies, the framework adds a new compliance layer in the country’s largest technology market. For residents, its value will be measured by whether failures become easier to identify before they cause harm.',
    ],
    keyPoints: [
      'Independent assessments are a central requirement.',
      'Implementation details will determine the rules’ reach.',
      'The framework could influence standards outside California.',
    ],
    author: 'Golden Coast Journal Technology Desk',
    publishedAt: '2026-09-11T19:45:00.000Z',
    updatedAt: '2026-09-11T21:02:00.000Z',
    readingMinutes: 4,
    imageUrl: '/ai-safeguards.png',
    imageAlt:
      'Graphic announcing California artificial intelligence safeguards',
    imageCredit: 'Office of the Governor of California',
    sources: [
      {
        name: 'Office of Governor Gavin Newsom',
        url: 'https://www.gov.ca.gov/newsroom/',
      },
    ],
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
    keyPoints: [
      'Grid supply and neighborhood service are separate measures.',
      'Outage duration and frequency reveal different problems.',
      'Comparable reporting is essential for accountability.',
    ],
    author: 'Golden Coast Journal Data Desk',
    publishedAt: '2026-09-10T15:30:00.000Z',
    updatedAt: '2026-09-10T15:30:00.000Z',
    readingMinutes: 5,
    imageUrl: '/california-coast.jpg',
    imageAlt: 'Aerial view of a developed California coastline',
    imageCredit: 'Clayton Cardinalli / Unsplash',
    sources: [
      {
        name: 'California Public Utilities Commission',
        url: 'https://www.cpuc.ca.gov/news-and-updates/all-news',
      },
    ],
    status: 'published',
    featured: false,
  },
  {
    id: 'gcj-005',
    slug: 'california-unemployment-august-brief',
    section: 'Economy',
    title:
      'California labor market shows improvement, with pressure still uneven',
    dek: 'The statewide unemployment rate improved to 5.1 percent, but a single headline number cannot describe every region or industry.',
    body: [
      'California’s unemployment rate improved to 5.1 percent in the state’s latest release, offering a broad signal of a labor market moving in the right direction.',
      'The statewide number is useful, but incomplete. Hiring conditions vary substantially by region and industry, and a declining rate can reflect changes in both employment and labor-force participation.',
      'The next useful comparison will be revised payroll estimates and county-level data, which can show whether gains are broad or concentrated in a smaller set of sectors.',
    ],
    keyPoints: [
      'The reported statewide rate improved to 5.1 percent.',
      'Regional and industry data can diverge from the headline.',
      'Future revisions may change the initial picture.',
    ],
    author: 'Golden Coast Journal Economy Desk',
    publishedAt: '2026-09-09T16:00:00.000Z',
    updatedAt: '2026-09-09T16:00:00.000Z',
    readingMinutes: 3,
    imageUrl: '/california-coast.jpg',
    imageAlt: 'Businesses and homes along the California coast',
    imageCredit: 'Clayton Cardinalli / Unsplash',
    sources: [
      {
        name: 'California Employment Development Department',
        url: 'https://edd.ca.gov/en/newsroom/',
      },
    ],
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
    keyPoints: [
      'Weekly figures are a snapshot, not a season-long forecast.',
      'Releases serve multiple operational and environmental purposes.',
      'One reservoir does not define statewide water conditions.',
    ],
    author: 'Golden Coast Journal Desk',
    publishedAt: '2026-09-08T14:12:00.000Z',
    updatedAt: '2026-09-08T14:12:00.000Z',
    readingMinutes: 4,
    imageUrl: '/oroville.jpg',
    imageAlt: 'Lake Oroville and the surrounding foothills',
    imageCredit: 'Florence Low / California Department of Water Resources',
    sources: [
      {
        name: 'California Department of Water Resources',
        url: 'https://water.ca.gov/',
      },
    ],
    status: 'published',
    featured: false,
  },
];

export const sections = [
  'California',
  'Nation',
  'World',
  'Business',
  'Technology',
  'Climate',
  'Culture',
  'Ideas',
];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}

export function getSectionArticles(section: string) {
  return articles.filter(
    (article) => article.section.toLowerCase() === section.toLowerCase(),
  );
}

export function formatArticleDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'America/Los_Angeles',
  }).format(new Date(value));
}
