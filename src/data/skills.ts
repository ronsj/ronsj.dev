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
        'Claude Code',
        'Cursor',
        'Docker',
        'Express.js',
        'Git',
        'GraphQL',
        'GSAP',
        'JavaScript',
        'Next.js',
        'Node.js',
        'PHP',
        'Playwright',
        'React',
        'REST',
        'Shopify/Liquid',
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
        'AI-assisted workflows',
        'APIs',
        'CI/CD',
        'Core Web Vitals',
        'E2E Testing',
        'Frontend Tooling',
        'Frontend/Web Frameworks',
        'Model Context Protocol',
        'Unit Testing',
      ],
    },
    {
      name: 'Design',
      items: ['Figma', 'Illustrator', 'Photoshop'],
    },
  ],
};
