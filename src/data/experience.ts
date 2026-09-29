export interface Role {
  /** Date range as displayed, e.g. "2022–2025". */
  years: string;
  title: string;
  company: string;
  companyUrl?: string;
  /** One line on the scope of the role, shown under the title. */
  scope?: string;
  /** Marks the role held now, shown as a badge under the years. */
  current?: boolean;
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
      years: '2026–20__',
      title: 'Frontend Developer',
      company: 'RealDefense',
      companyUrl: 'https://realdefense.com',
      scope: 'Owned frontend architecture for new marketing sites and blogs.',
    },
    {
      years: '2022–2025',
      title: 'Frontend Engineer',
      company: 'SDG',
      companyUrl: 'https://sdg.la',
      scope: 'Individually contributed to frontend development for various client projects.',
    },
    {
      years: '2016–2022',
      title: 'Frontend Supervisor',
      company: 'Einstein',
      companyUrl: 'https://einsteinindustries.com',
      scope: 'Led frontend development for a proprietary CMS.',
    },
  ],
};
