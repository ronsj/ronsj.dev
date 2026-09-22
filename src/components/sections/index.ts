import AboutSection from './AboutSection.astro';
import ContactSection from './ContactSection.astro';
import ExperienceSection from './ExperienceSection.astro';
import IntroSection from './IntroSection.astro';
import SkillsSection from './SkillsSection.astro';
import WorkSection from './WorkSection.astro';

/**
 * The sections in scroll order. Each is its own component with its own data, including the anchor id
 * the nav jumps to; scripts/sections.ts reads those ids from the rendered sections.
 */
export const sections = [
  IntroSection,
  AboutSection,
  WorkSection,
  ExperienceSection,
  SkillsSection,
  ContactSection,
];
