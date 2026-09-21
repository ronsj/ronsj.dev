import { about } from '../../data/about';
import { contact } from '../../data/contact';
import { experience } from '../../data/experience';
import { intro } from '../../data/intro';
import { work } from '../../data/work';
import AboutStage from './AboutStage.astro';
import ContactStage from './ContactStage.astro';
import ExperienceStage from './ExperienceStage.astro';
import IntroStage from './IntroStage.astro';
import WorkStage from './WorkStage.astro';

/**
 * The stages in scroll order. Each stage is its own component with its own data; this list only
 * pairs them with the anchor id the story and the nav jump to.
 */
export const stages = [
  { id: intro.id, Stage: IntroStage },
  { id: about.id, Stage: AboutStage },
  { id: work.id, Stage: WorkStage },
  { id: experience.id, Stage: ExperienceStage },
  { id: contact.id, Stage: ContactStage },
];
