import type { PageId } from '../pages/contract';
import type { SectionId } from '../sections/contract';

/**
 * Text the scene shows. Loaded with the scene; each page's own content lives in `src/content/pages/`
 * and loads only when that page opens.
 * PLACEHOLDER marks text that is still to come from Vardaan.
 */

export const SITE_NAME = 'Vardaan';

export const LANDING = {
  name: SITE_NAME,
  line: 'Placeholder line', // PLACEHOLDER
  subline: 'Computer vision · full-stack web · C/DSP systems', // DECISIONS 2 Subline; FACTS 1 Headline role
  /** Shown as the word above the arrow. Hidden from screen readers; the menu is their way through. */
  scrollCue: { label: 'Scroll', arrow: '↓' },
};

export const SECTION_TITLES: Record<SectionId, string> = {
  about: 'About',
  projects: 'Projects',
  experience: 'Experience',
  publications: 'Publications',
  contact: 'Contact',
};

export const SECTION_LINES: Record<SectionId, string> = {
  about: 'B.Tech in Data Science and Artificial Intelligence', // DECISIONS 7; FACTS 1 Institution and degree
  // PLACEHOLDER: becomes a line computed from the project pages' statuses once they exist.
  projects: 'Placeholder one-liner',
  experience: 'DRDO · AgryBin', // FACTS 2.1 Display line, 2.2 Company name
  publications: 'Two IEEE conference papers (first author, CICT 2025)', // DECISIONS 2 Research line; FACTS 1 "Published IEEE author"
  contact: 'Open to remote roles.', // DECISIONS 1; FACTS 1 Target roles
};

/** Marker labels, page headings and document titles. */
export const PAGE_LABELS: Record<PageId, string> = {
  about: 'About',
  datavista: 'DataVista', // FACTS 3.1
  'neuroinsight-ai': 'NeuroInsight-AI', // FACTS 3.2
  attrition: 'Employee Attrition Analysis', // FACTS 3.3 Project name
  kanbanlight: 'KanbanLight', // FACTS 3.5
  'unified-api-ingester': 'Unified API Ingester', // FACTS 3.6
  experience: 'Experience',
  publications: 'Publications',
  contact: 'Contact',
};
