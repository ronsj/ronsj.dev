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
        'I built theme sections across the storefront, from landing pages for subscriptions with custom subscription configurators to the interactive product listing pages: carousels, product grids and filters with pagination. I also built the main product configurator, which brings one-time and subscription purchases together in a single flow.',
    },
    {
      name: 'SYRN',
      url: 'https://syrn.com',
      summary: 'Initial Shopify store build and theme scaffolding',
      description:
        'SYRN was a brand new brand launching its first online store, and I scaffolded the project from day one: the Shopify theme itself and the developer tooling around it, from Vite to linting, formatting and testing. I also set up the store backend, modelling the content with metafields and metaobjects. From there I built the initial home page and product page sections, including a set brought to life with GSAP animations.',
    },
    {
      name: 'Barnes & Noble',
      url: 'https://barnesandnoble.com',
      summary: 'Headless Shopify & CMS integration',
      description:
        'Barnes & Noble, one of the largest e-commerce brands in the world, moved its online store to headless Shopify with Sanity as the CMS, and I worked on that store and content migration. I integrated content from Sanity into Shopify sections, so the storefront could draw on both. I also worked on the product page configurator.',
    },
  ],
};
