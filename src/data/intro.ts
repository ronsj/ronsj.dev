export interface Intro {
  id: string;
  /** Role line shown above the name. */
  role: string;
  name: string;
}

export const intro: Intro = {
  id: 'intro',
  role: 'Fullstack Developer',
  name: 'Ron San Jose',
};
