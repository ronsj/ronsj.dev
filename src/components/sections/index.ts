import { about } from '../../data/about';
import { contact } from '../../data/contact';
import { experience } from '../../data/experience';
import { intro } from '../../data/intro';
import { skills } from '../../data/skills';
import { work } from '../../data/work';
import AboutSection from './AboutSection.astro';
import ContactSection from './ContactSection.astro';
import ExperienceSection from './ExperienceSection.astro';
import IntroSection from './IntroSection.astro';
import SkillsSection from './SkillsSection.astro';
import WorkSection from './WorkSection.astro';

/**
 * The sections in scroll order. Each section is its own component with its own data; this list only
 * pairs them with the anchor id the story and the nav jump to.
 */
export const sections = [
  { id: intro.id, Section: IntroSection },
  { id: about.id, Section: AboutSection },
  { id: work.id, Section: WorkSection },
  { id: experience.id, Section: ExperienceSection },
  { id: skills.id, Section: SkillsSection },
  { id: contact.id, Section: ContactSection },
];
