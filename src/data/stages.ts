export interface StageItem {
  n: string;
  a: string;
  b: string;
}

export interface Stage {
  id: string;
  kicker: string;
  title: string;
  body: string;
  items?: StageItem[];
}

export const stages: Stage[] = [
  {
    id: "intro",
    kicker: "Frontend developer",
    title: "Ron San Jose",
    body: "I build interfaces that feel fast, precise and alive ~ where motion has a reason and every pixel earns its place.",
  },
  {
    id: "about",
    kicker: "About",
    title: "Pixels with purpose.",
    body: "Six years turning ambiguous briefs into shipped products. I care about performance budgets, accessible markup and the small details people feel but never notice.",
  },
  {
    id: "stack",
    kicker: "Skills / stack",
    title: "The stack.",
    body: "Tools chosen for the job, not the trend.",
    items: [
      { n: "01", a: "React, Next.js, TypeScript", b: "~ product UI and design systems" },
      { n: "02", a: "WebGL, Three.js, GSAP", b: "~ motion and 3D on the web" },
      { n: "03", a: "Node, GraphQL, Vite", b: "~ tooling and the edges of the stack" },
    ],
  },
  {
    id: "work",
    kicker: "Selected work",
    title: "Selected work.",
    body: "A few things I am proud to have shipped.",
    items: [
      { n: "01", a: "Project name", b: "~ one-line description, role, year" },
      { n: "02", a: "Project name", b: "~ one-line description, role, year" },
      { n: "03", a: "Project name", b: "~ one-line description, role, year" },
    ],
  },
  {
    id: "experience",
    kicker: "Experience",
    title: "Developer DNA.",
    body: "Where I have been.",
    items: [
      { n: "2023–20__", a: "Senior Frontend Engineer", b: "· Company" },
      { n: "2020–2023", a: "Frontend Engineer", b: "· Company" },
      { n: "2018–2020", a: "UI Developer", b: "· Studio" },
    ],
  },
  {
    id: "open-source",
    kicker: "Open source",
    title: "In the open.",
    body: "Libraries and experiments I maintain or contribute to.",
    items: [
      { n: "★", a: "library-name", b: "~ what it does, in one line" },
      { n: "★", a: "library-name", b: "~ what it does, in one line" },
    ],
  },
  {
    id: "contact",
    kicker: "Contact",
    title: "Let’s connect.",
    body: "Open to senior frontend roles and select freelance projects.",
  },
];

export const contactLinks = [
  { label: "hello@ronsanjose.dev", href: "mailto:hello@ronsanjose.dev", external: false },
  { label: "GitHub", href: "https://github.com", external: true },
  { label: "LinkedIn", href: "https://linkedin.com", external: true },
];
