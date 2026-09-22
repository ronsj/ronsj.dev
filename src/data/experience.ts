export interface Role {
  /** Date range as displayed, e.g. "2022–2025". */
  years: string;
  title: string;
  company: string;
  companyUrl?: string;
}

export interface Experience {
  id: string;
  kicker: string;
  title: string;
  body: string;
  roles: Role[];
}

export const experience: Experience = {
  id: 'experience',
  kicker: 'Experience',
  title: 'Developer DNA.',
  body: 'Where I have been.',
  roles: [
    {
      years: '2025–20__',
      title: 'Frontend Developer',
      company: 'RealDefense',
      companyUrl: 'https://realdefense.com',
    },
    {
      years: '2022–2025',
      title: 'Frontend Engineer',
      company: 'SDG',
      companyUrl: 'https://sdg.la',
    },
    {
      years: '2016–2022',
      title: 'Frontend Supervisor',
      company: 'Einstein',
      companyUrl: 'https://einsteinindustries.com',
    },
  ],
};
