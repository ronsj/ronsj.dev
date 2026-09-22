export interface SkillGroup {
  name: string;
  items: string[];
}

export interface Skills {
  id: string;
  kicker: string;
  title: string;
  body: string;
  groups: SkillGroup[];
}

export const skills: Skills = {
  id: 'skills',
  kicker: 'Skills',
  title: 'The stack.',
  body: 'Knowledge and tools for the job.',
  groups: [
    {
      name: 'Tech',
      items: [
        'Astro',
        'Claude Code',
        'CSS',
        'Cursor',
        'Docker',
        'Express.js',
        'Git',
        'GraphQL',
        'GSAP',
        'HTML',
        'JavaScript',
        'Next.js',
        'Node.js',
        'PHP',
        'Playwright',
        'React',
        'REST',
        'Sass',
        'Shopify',
        'Tailwind CSS',
        'TypeScript',
        'Vite',
        'Vue.js',
      ],
    },
    {
      name: 'Topics',
      items: [
        'Accessibility',
        'Agile/Scrum',
        'AI-assisted workflows',
        'APIs',
        'CI/CD',
        'Content Management Systems',
        'Core Web Vitals',
        'E-commerce',
        'E2E Testing',
        'Frontend Tooling',
        'Frontend Frameworks',
        'Frontend Development',
        'Fullstack Development',
        'Model Context Protocol',
        'SEO',
        'Unit Testing',
      ],
    },
    {
      name: 'Design',
      items: ['Figma', 'Illustrator', 'Photoshop'],
    },
  ],
};
