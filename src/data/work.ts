export interface Project {
  name: string;
  url: string;
  /** What I did there, in a few words. */
  summary: string;
  /** The longer story, shown when the project is expanded. Up to five sentences. */
  description: string;
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
      description:
        'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    },
    {
      name: 'SYRN',
      url: 'https://syrn.com',
      summary: 'Initial Shopify theme implementation',
      description:
        'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium. Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.',
    },
    {
      name: 'Barnes & Noble',
      url: 'https://barnesandnoble.com',
      summary: 'Headless Shopify theme development',
      description:
        'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti. Quos dolores et quas molestias excepturi sint occaecati cupiditate non provident. Similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit.',
    },
  ],
};
