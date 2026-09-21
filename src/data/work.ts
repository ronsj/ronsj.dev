export interface Project {
  name: string;
  url: string;
  /** What I did there, in a few words. */
  summary: string;
}

export interface Work {
  id: string;
  kicker: string;
  title: string;
  body: string;
  projects: Project[];
}

export const work: Work = {
  id: 'work',
  kicker: 'Work',
  title: 'Selected work.',
  body: 'A few things I am proud to have shipped.',
  projects: [
    {
      name: "Peet's Coffee",
      url: 'https://peets.com',
      summary: 'Subscription onboarding development',
    },
    {
      name: 'SYRN',
      url: 'https://syrn.com',
      summary: 'Initial Shopify theme implementation',
    },
    {
      name: 'Barnes & Noble',
      url: 'https://barnesandnoble.com',
      summary: 'Headless Shopify theme development',
    },
  ],
};
