/** Every full page, one per marker. A page belongs to exactly one section (see `src/sections/layouts.ts`). */
export type PageId =
  | 'about'
  | 'datavista'
  | 'neuroinsight-ai'
  | 'attrition'
  | 'kanbanlight'
  | 'unified-api-ingester'
  | 'experience'
  | 'publications'
  | 'contact';

export const PAGE_IDS: readonly PageId[] = [
  'about',
  'datavista',
  'neuroinsight-ai',
  'attrition',
  'kanbanlight',
  'unified-api-ingester',
  'experience',
  'publications',
  'contact',
];

export interface PageProps {
  /** id for the page's h1, which labels the main landmark. */
  headingId: string;
}
