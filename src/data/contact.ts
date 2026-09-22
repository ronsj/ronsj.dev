export interface ContactLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface Contact {
  id: string;
  kicker: string;
  title: string;
  body: string;
  links: ContactLink[];
}

export const contact: Contact = {
  id: 'contact',
  kicker: 'Contact',
  title: 'Let’s connect.',
  body: 'Open to senior roles and freelance projects.',
  links: [
    { label: 'GitHub', href: 'https://github.com/ronsj', external: true },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ronsanjose', external: true },
  ],
};
