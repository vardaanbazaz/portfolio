import type { ItemId, PageId } from '../pages/contract';
import type { SectionId } from '../sections/contract';
import { content as experience } from './pages/experience';
import { VERSE, VERSE_FIRST_LINE } from './verse';

/**
 * Text the scene shows. Loaded with the scene; each page's own content lives in `src/content/pages/`
 * and loads only when that page or one of its panels opens. The one exception is Experience's short content,
 * which the scene loads too for its caption's second line.
 */

export const SITE_NAME = 'Vardaan';

export const LANDING = {
  name: SITE_NAME,
  /** In Devanagari; shown with lang="sa". From the verse, src/content/verse.ts. */
  line: VERSE_FIRST_LINE,
  /** The line's translation, then its source. */
  gloss: { text: VERSE.translation[0], source: VERSE.source },
  subline: 'Computer vision · full-stack web · C/DSP systems',
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

export type ProjectPageId = Extract<PageId, 'datavista' | 'neuroinsight-ai' | 'attrition' | 'kanbanlight' | 'unified-api-ingester'>;

export type ProjectStatus = 'Completed' | 'In Development';

/** Each project's status, shown on its page and counted in the Projects caption. */
export const PROJECT_STATUS: Record<ProjectPageId, ProjectStatus> = {
  datavista: 'Completed',
  'neuroinsight-ai': 'Completed',
  attrition: 'Completed',
  kanbanlight: 'In Development',
  'unified-api-ingester': 'In Development',
};

const STATUS_ORDER: readonly ProjectStatus[] = ['Completed', 'In Development'];

/** For example "3 completed · 2 in development"; a status no project has is left out. */
export function projectsCaption(statuses: Record<string, ProjectStatus>): string {
  const all = Object.values(statuses);
  return STATUS_ORDER.map((status) => [all.filter((s) => s === status).length, status] as const)
    .filter(([count]) => count > 0)
    .map(([count, status]) => `${count} ${status.toLowerCase()}`)
    .join(' · ');
}

export const SECTION_LINES: Record<SectionId, string> = {
  about: 'B.Tech in Data Science and Artificial Intelligence',
  projects: projectsCaption(PROJECT_STATUS), // computed from PROJECT_STATUS
  experience: 'Research and Development Intern · Web/App Developer', // the role titles, src/content/pages/experience.ts
  publications: 'Two IEEE conference papers (first author, CICT 2025)',
  contact: 'Open to remote roles.',
};

/** A second caption line, beneath the one-liner, for sections that have one. */
export const SECTION_NOTES: Partial<Record<SectionId, string>> = {
  experience: experience.also,
};

/** Marker labels, page headings and document titles. */
export const PAGE_LABELS: Record<PageId, string> = {
  about: 'About',
  datavista: 'DataVista',
  'neuroinsight-ai': 'NeuroInsight-AI',
  attrition: 'Employee Attrition Analysis',
  kanbanlight: 'KanbanLight',
  'unified-api-ingester': 'Unified API Ingester',
  experience: 'Experience',
  publications: 'Publications',
  contact: 'Contact',
};

/** Labels of the markers that open an item of a page. */
export const ITEM_LABELS: Record<ItemId, string> = {
  drdo: 'DRDO',
  agrybin: 'AgryBin',
  'v-surveillance': 'V-Surveillance', // paper title, src/content/pages/publications.ts
  'web-page-linker': 'Web Page Linker', // paper title, src/content/pages/publications.ts
};

/** A marker's label: its item's, or its page's. */
export const markerLabel = ({ page, item }: { page: PageId; item?: ItemId }) => (item ? ITEM_LABELS[item] : PAGE_LABELS[page]);
