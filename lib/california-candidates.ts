export type CandidateCategory =
  | 'Executive'
  | 'Fiscal'
  | 'Justice and regulation'
  | 'Education'
  | 'Board of Equalization';

export type CaliforniaCandidate = {
  name: string;
  party: 'Democratic' | 'Republican' | 'Nonpartisan';
  district?: 1 | 2 | 3 | 4;
  statementAvailable: boolean;
};

export type CaliforniaCandidateOffice = {
  id: string;
  name: string;
  category: CandidateCategory;
  jurisdiction: 'Statewide' | 'District';
  responsibility: string;
  officialUrl: string;
  candidates: CaliforniaCandidate[];
};

export const candidateGuideVerifiedAt = '2026-09-14';

export const candidateCategories: Array<'All' | CandidateCategory> = [
  'All',
  'Executive',
  'Fiscal',
  'Justice and regulation',
  'Education',
  'Board of Equalization',
];

export const californiaCandidateOffices: CaliforniaCandidateOffice[] = [
  {
    id: 'governor',
    name: 'Governor',
    category: 'Executive',
    jurisdiction: 'Statewide',
    responsibility:
      'Leads the executive branch, proposes the state budget, signs or vetoes legislation and directs state resources during emergencies.',
    officialUrl:
      'https://voterguide.sos.ca.gov/candidates/governor-candidate-statements.htm',
    candidates: [
      {
        name: 'Xavier Becerra',
        party: 'Democratic',
        statementAvailable: false,
      },
      {
        name: 'Steve Hilton',
        party: 'Republican',
        statementAvailable: false,
      },
    ],
  },
  {
    id: 'lieutenant-governor',
    name: 'Lieutenant Governor',
    category: 'Executive',
    jurisdiction: 'Statewide',
    responsibility:
      'Assumes the governor’s duties when required, presides over the State Senate and serves on state economic, lands, ocean and university governing bodies.',
    officialUrl:
      'https://voterguide.sos.ca.gov/candidates/lt-governor-candidate-statements.htm',
    candidates: [
      { name: 'Fiona Ma', party: 'Democratic', statementAvailable: true },
      {
        name: 'Gloria Romero',
        party: 'Republican',
        statementAvailable: true,
      },
    ],
  },
  {
    id: 'secretary-of-state',
    name: 'Secretary of State',
    category: 'Executive',
    jurisdiction: 'Statewide',
    responsibility:
      'Oversees statewide elections, provides campaign and lobbying financial information and maintains business, trademark and notary records.',
    officialUrl:
      'https://voterguide.sos.ca.gov/candidates/sos-candidate-statements.htm',
    candidates: [
      {
        name: 'Donald P. (Don) Wagner',
        party: 'Republican',
        statementAvailable: true,
      },
      {
        name: 'Shirley N. Weber',
        party: 'Democratic',
        statementAvailable: true,
      },
    ],
  },
  {
    id: 'controller',
    name: 'Controller',
    category: 'Fiscal',
    jurisdiction: 'Statewide',
    responsibility:
      'Acts as the state’s chief fiscal officer, accounts for public funds, administers payroll and unclaimed property and audits state operations.',
    officialUrl:
      'https://voterguide.sos.ca.gov/candidates/controller-candidate-statements.htm',
    candidates: [
      {
        name: 'Malia M. Cohen',
        party: 'Democratic',
        statementAvailable: true,
      },
      {
        name: 'Herb W Morgan',
        party: 'Republican',
        statementAvailable: true,
      },
    ],
  },
  {
    id: 'treasurer',
    name: 'Treasurer',
    category: 'Fiscal',
    jurisdiction: 'Statewide',
    responsibility:
      'Serves as the state’s banker, manages investments, administers state bond and note sales and pays out funds authorized for spending.',
    officialUrl:
      'https://voterguide.sos.ca.gov/candidates/treasurer-candidate-statements.htm',
    candidates: [
      {
        name: 'Jennifer Hawks',
        party: 'Republican',
        statementAvailable: true,
      },
      {
        name: 'Eleni Kounalakis',
        party: 'Democratic',
        statementAvailable: true,
      },
    ],
  },
  {
    id: 'attorney-general',
    name: 'Attorney General',
    category: 'Justice and regulation',
    jurisdiction: 'Statewide',
    responsibility:
      'Leads the California Department of Justice, represents the state in court and oversees enforcement of state law.',
    officialUrl:
      'https://voterguide.sos.ca.gov/candidates/attorney-general-candidate-statements.htm',
    candidates: [
      { name: 'Rob Bonta', party: 'Democratic', statementAvailable: false },
      {
        name: 'Michael E. Gates',
        party: 'Republican',
        statementAvailable: true,
      },
    ],
  },
  {
    id: 'insurance-commissioner',
    name: 'Insurance Commissioner',
    category: 'Justice and regulation',
    jurisdiction: 'Statewide',
    responsibility:
      'Heads the Department of Insurance, enforces insurance law, regulates insurers and handles public questions and complaints about the industry.',
    officialUrl:
      'https://voterguide.sos.ca.gov/candidates/insurance-commissioner-candidate-statements.htm',
    candidates: [
      { name: 'Ben Allen', party: 'Democratic', statementAvailable: true },
      { name: 'Jane Kim', party: 'Democratic', statementAvailable: true },
    ],
  },
  {
    id: 'superintendent-public-instruction',
    name: 'Superintendent of Public Instruction',
    category: 'Education',
    jurisdiction: 'Statewide',
    responsibility:
      'Serves as California’s elected nonpartisan voice in public education and sits on governing boards across the state education system.',
    officialUrl:
      'https://voterguide.sos.ca.gov/candidates/superintendent-candidate-statements.htm',
    candidates: [
      {
        name: 'Richard Barrera',
        party: 'Nonpartisan',
        statementAvailable: true,
      },
      {
        name: 'Sonja Shaw',
        party: 'Nonpartisan',
        statementAvailable: true,
      },
    ],
  },
  {
    id: 'board-of-equalization',
    name: 'Board of Equalization',
    category: 'Board of Equalization',
    jurisdiction: 'District',
    responsibility:
      'Oversees county property-assessment practices and assesses certain regulated utility, railroad, insurer and alcohol-related taxes.',
    officialUrl:
      'https://voterguide.sos.ca.gov/candidates/boe-candidate-statements.htm',
    candidates: [
      {
        name: 'Nelson Esparza',
        party: 'Democratic',
        district: 1,
        statementAvailable: true,
      },
      {
        name: 'Shannon Grove',
        party: 'Republican',
        district: 1,
        statementAvailable: true,
      },
      {
        name: 'Sally J. Lieber',
        party: 'Democratic',
        district: 2,
        statementAvailable: true,
      },
      {
        name: 'John Pimentel',
        party: 'Democratic',
        district: 2,
        statementAvailable: true,
      },
      {
        name: 'Mike Gipson',
        party: 'Democratic',
        district: 3,
        statementAvailable: true,
      },
      {
        name: 'Samuel P. Sukaton',
        party: 'Democratic',
        district: 3,
        statementAvailable: false,
      },
      {
        name: 'Denis Bilodeau',
        party: 'Republican',
        district: 4,
        statementAvailable: true,
      },
      {
        name: 'Tom Umberg',
        party: 'Democratic',
        district: 4,
        statementAvailable: true,
      },
    ],
  },
];

export const californiaCandidateCount = californiaCandidateOffices.reduce(
  (total, office) => total + office.candidates.length,
  0,
);
