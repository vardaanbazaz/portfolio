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
  about: 'Placeholder one-liner', // PLACEHOLDER
  projects: 'Placeholder one-liner', // PLACEHOLDER
  experience: 'Placeholder one-liner', // PLACEHOLDER
  publications: 'Placeholder one-liner', // PLACEHOLDER
  contact: 'Placeholder one-liner', // PLACEHOLDER
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
