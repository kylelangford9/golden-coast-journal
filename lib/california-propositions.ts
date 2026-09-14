export type PropositionTopic =
  | 'Housing'
  | 'Budget'
  | 'Taxes'
  | 'Elections'
  | 'Health'
  | 'Environment';

export type CaliforniaProposition = {
  number: number;
  shortTitle: string;
  officialTitle: string;
  measureType: string;
  placedBy: 'Legislature' | 'Petition signatures';
  topics: PropositionTopic[];
  summary: string;
  yesMeans: string;
  noMeans: string;
  fiscalEffect: string;
  officialUrl: string;
};

export const propositionGuideVerifiedAt = '2026-09-14';

export const californiaPropositions: CaliforniaProposition[] = [
  {
    number: 1,
    shortTitle: 'Housing affordability bonds',
    officialTitle: 'Authorizes Bonds for Housing Affordability Programs',
    measureType: 'Legislative statute',
    placedBy: 'Legislature',
    topics: ['Housing', 'Budget'],
    summary:
      'Authorizes $11.25 billion in state general obligation bonds for veterans and affordable housing programs, including rental housing, supportive housing and downpayment assistance.',
    yesMeans:
      'California could borrow $11.25 billion for veterans and affordable housing programs.',
    noMeans:
      'California could not borrow the proposed $11.25 billion for those programs.',
    fiscalEffect:
      'Estimated state repayment costs of $500 million to $600 million annually for about 25 years.',
    officialUrl: 'https://voterguide.sos.ca.gov/propositions/1/',
  },
  {
    number: 2,
    shortTitle: 'State rainy day fund',
    officialTitle: "Increases State's Rainy Day Fund",
    measureType: 'Legislative constitutional amendment',
    placedBy: 'Legislature',
    topics: ['Budget'],
    summary:
      'Changes how California builds budget reserves and pays certain debts; it also raises the cap on the main rainy day fund.',
    yesMeans:
      'Reserve-building and debt-payment rules would change; state budget reserves would be higher and extra debt payments would continue longer.',
    noMeans:
      'The current reserve-building and debt-payment rules would remain in place.',
    fiscalEffect: 'State budget reserves would be higher.',
    officialUrl: 'https://voterguide.sos.ca.gov/propositions/2/',
  },
  {
    number: 3,
    shortTitle: 'High-income tax extension',
    officialTitle:
      'Provides Permanent Funding for Schools and Health Care by Extending Existing Tax on High Incomes',
    measureType: 'Initiative constitutional amendment',
    placedBy: 'Petition signatures',
    topics: ['Taxes', 'Budget'],
    summary:
      'Makes permanent tax rates first approved in 2012 for high-income earners instead of allowing them to expire in 2031; revenue continues to support public education.',
    yesMeans:
      'The existing income-tax increase on high-income earners would become permanent.',
    noMeans:
      'The existing income-tax increase would expire in 2031 under current law.',
    fiscalEffect:
      'Maintains an estimated $5 billion to $15 billion in annual state income-tax revenue.',
    officialUrl: 'https://voterguide.sos.ca.gov/propositions/3/',
  },
  {
    number: 4,
    shortTitle: 'Public campaign financing',
    officialTitle:
      'Repeals Prohibition Against Public Funding of Election Campaigns',
    measureType: 'Legislative statute',
    placedBy: 'Legislature',
    topics: ['Elections', 'Budget'],
    summary:
      'Allows state and local governments to create public campaign-financing programs, with restrictions on the funds and candidates involved.',
    yesMeans:
      'State and local governments could create public campaign-financing programs under specified limits.',
    noMeans:
      'State and most local governments would remain unable to create those programs.',
    fiscalEffect:
      'Ongoing state costs of a few hundred thousand dollars each year for Fair Political Practices Commission guidance.',
    officialUrl: 'https://voterguide.sos.ca.gov/propositions/4/',
  },
  {
    number: 5,
    shortTitle: 'Statewide recall elections',
    officialTitle: 'Changes Recall Election Process for Statewide Officers',
    measureType: 'Legislative constitutional amendment',
    placedBy: 'Legislature',
    topics: ['Elections'],
    summary:
      'Removes the replacement-candidate question from statewide recall ballots; vacancies would generally be filled later by special election or appointment.',
    yesMeans:
      'Recall ballots would no longer ask voters to choose a replacement at the same election.',
    noMeans:
      'Voters would continue choosing a potential replacement as part of a recall election.',
    fiscalEffect:
      'Net effect is unknown; a recall could create savings or costs of millions of dollars depending on the office and election timing.',
    officialUrl: 'https://voterguide.sos.ca.gov/propositions/5/',
  },
  {
    number: 37,
    shortTitle: 'Middle-income homebuyer loans',
    officialTitle:
      'Creates Loan Program for Middle-Income Buyers of Qualified New Homes',
    measureType: 'Initiative statute',
    placedBy: 'Petition signatures',
    topics: ['Housing'],
    summary:
      'Creates a homebuying-assistance program backed by up to $25 billion in revenue bonds for eligible California residents buying qualified new homes.',
    yesMeans:
      'The state would create the program; participating homeowners would repay the bonds through their loan payments.',
    noMeans:
      'The state would not be required to create the proposed homebuying-assistance program.',
    fiscalEffect: 'No direct state or local government costs are estimated.',
    officialUrl: 'https://voterguide.sos.ca.gov/propositions/37/',
  },
  {
    number: 38,
    shortTitle: 'Immunology research bonds',
    officialTitle: 'Authorizes Bonds for Immunology Medical Research',
    measureType: 'Initiative statute',
    placedBy: 'Petition signatures',
    topics: ['Health', 'Budget'],
    summary:
      'Authorizes $8.4 billion in state general obligation bonds for immunology and immunotherapy research at California institutions.',
    yesMeans:
      'California could borrow $8.4 billion to support the specified medical research.',
    noMeans:
      'California could not borrow the proposed $8.4 billion for that research.',
    fiscalEffect:
      'Estimated state repayment costs of $500 million to $600 million annually for about 20 years; research revenue could offset some or all of that cost, but the amount is uncertain.',
    officialUrl: 'https://voterguide.sos.ca.gov/propositions/38/',
  },
  {
    number: 39,
    shortTitle: 'Voter identification requirements',
    officialTitle:
      'Prohibits Citizens from Voting Unless They Present Government-Issued Identification',
    measureType: 'Initiative constitutional amendment',
    placedBy: 'Petition signatures',
    topics: ['Elections'],
    summary:
      'Adds identification requirements for in-person and mail voting; the state would provide voter identification cards on request.',
    yesMeans:
      'Voters would have to provide additional identifying information each time they vote.',
    noMeans:
      "A voter's identity would continue to be established through the existing signature process.",
    fiscalEffect:
      'Estimated annual state and local costs range from tens of millions of dollars to the low hundreds of millions of dollars.',
    officialUrl: 'https://voterguide.sos.ca.gov/propositions/39/',
  },
  {
    number: 40,
    shortTitle: 'One-time tax on billionaires',
    officialTitle: 'Imposes One-Time Tax on Certain Taxpayers',
    measureType: 'Initiative constitutional amendment and statute',
    placedBy: 'Petition signatures',
    topics: ['Taxes', 'Health', 'Budget'],
    summary:
      'Creates a one-time 5% tax on certain taxpayers with assets over $1 billion; most revenue would support health care.',
    yesMeans:
      'California would collect the proposed one-time tax from covered billionaires.',
    noMeans: 'California would not collect the proposed one-time tax.',
    fiscalEffect:
      'Estimated temporary revenue totals tens of billions of dollars over several years; ongoing income-tax revenue could fall by less than $1 billion per year.',
    officialUrl: 'https://voterguide.sos.ca.gov/propositions/40/',
  },
  {
    number: 41,
    shortTitle: 'Special-tax audits and spending limits',
    officialTitle:
      'Prohibits New State Taxes That Exclude Revenues from State Spending Limit; Requires Audits for New State Special Taxes',
    measureType: 'Initiative constitutional amendment',
    placedBy: 'Petition signatures',
    topics: ['Taxes', 'Budget'],
    summary:
      'Requires audits of programs funded by new state special taxes and restricts new taxes that exclude their revenue from the state spending limit.',
    yesMeans:
      'The State Auditor would review more special-tax programs; California might not be able to exclude new special-tax spending from its spending limit.',
    noMeans:
      "The State Auditor's responsibilities and existing state spending-limit rules would not change.",
    fiscalEffect:
      'The net effect is unknown because it depends on future voter and policymaker decisions.',
    officialUrl: 'https://voterguide.sos.ca.gov/propositions/41/',
  },
  {
    number: 42,
    shortTitle: 'Personal-property and retroactive taxes',
    officialTitle:
      'Prohibits New State Personal Property Taxes and Certain Retroactive State Taxes',
    measureType: 'Initiative constitutional amendment',
    placedBy: 'Petition signatures',
    topics: ['Taxes'],
    summary:
      'Bars new state taxes on ownership of financial assets and other personal property; it also restricts certain retroactive state taxes.',
    yesMeans:
      'California could not establish new taxes on ownership of financial assets or other personal property.',
    noMeans:
      'California would retain the option to establish new taxes on those assets or other personal property.',
    fiscalEffect: 'Future state tax revenue might not rise as much.',
    officialUrl: 'https://voterguide.sos.ca.gov/propositions/42/',
  },
  {
    number: 43,
    shortTitle: 'Local special-tax vote threshold',
    officialTitle:
      "Limits Voters' Ability to Raise Revenues for Local Government Services",
    measureType: 'Legislative constitutional amendment',
    placedBy: 'Legislature',
    topics: ['Taxes', 'Budget'],
    summary:
      'Raises the approval threshold for certain voter-proposed local special taxes from a majority to two-thirds beginning January 1, 2027.',
    yesMeans:
      'Certain local government taxes would require approval from two-thirds of voters.',
    noMeans:
      'Those voter-proposed local taxes could continue to pass with a majority vote.',
    fiscalEffect:
      'Future local government tax revenue might not rise as much because of the higher approval threshold.',
    officialUrl: 'https://voterguide.sos.ca.gov/propositions/43/',
  },
  {
    number: 44,
    shortTitle: 'Community-clinic spending',
    officialTitle:
      'Requires Community Health Clinics Spend 90% of Revenue on Program Services',
    measureType: 'Initiative statute',
    placedBy: 'Petition signatures',
    topics: ['Health'],
    summary:
      'Requires certain nonprofit community health clinics to spend at least 90% of annual revenue on program services advancing their charitable purpose.',
    yesMeans:
      'Covered clinics would have to meet the new 90% program-services spending requirement.',
    noMeans: 'The proposed spending requirement would not take effect.',
    fiscalEffect:
      'Estimated state costs are in the low tens of millions of dollars each year; fees would cover those costs.',
    officialUrl: 'https://voterguide.sos.ca.gov/propositions/44/',
  },
  {
    number: 45,
    shortTitle: 'Environmental-review deadlines',
    officialTitle: 'Modifies Environmental Review for Certain Projects',
    measureType: 'Initiative statute',
    placedBy: 'Petition signatures',
    topics: ['Environment', 'Housing'],
    summary:
      'Creates new deadlines and court procedures for environmental review of certain housing, transportation, water and health projects.',
    yesMeans:
      'Covered projects could use the new review and court procedures, including tighter time limits.',
    noMeans:
      'Covered projects would continue using the existing environmental-review and court procedures.',
    fiscalEffect:
      'Initial government costs are likely in the high tens of millions of dollars and could exceed $100 million annually; fees would cover part of the cost, while longer-term effects are uncertain.',
    officialUrl: 'https://voterguide.sos.ca.gov/propositions/45/',
  },
];

export const propositionTopics: Array<'All' | PropositionTopic> = [
  'All',
  'Housing',
  'Budget',
  'Taxes',
  'Elections',
  'Health',
  'Environment',
];
