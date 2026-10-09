import type { SectionId, SectionVisualModule } from './contract';
import { aboutVisual } from './about';
import { projectsVisual } from './projects';
import { experienceVisual } from './experience';
import { publicationsVisual } from './publications';
import { contactVisual } from './contact';

export const sectionVisuals: Record<SectionId, SectionVisualModule> = {
  about: aboutVisual,
  projects: projectsVisual,
  experience: experienceVisual,
  publications: publicationsVisual,
  contact: contactVisual,
};
