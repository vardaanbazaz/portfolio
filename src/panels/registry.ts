import type { PanelItemId, PanelProps } from '../pages/contract';
import { lazyChunk, type LazyChunk } from '../ui/chunk';

const rolePanel = lazyChunk<PanelProps>(() => import('./RolePanel'));

/** Each kind of panel and its content are their own chunk, kept out of the first download and fetched like a page's
 *  (see `src/preload.ts`). */
export const panels: Record<PanelItemId, LazyChunk<PanelProps>> = {
  drdo: rolePanel,
  agrybin: rolePanel,
  'web-page-linker': lazyChunk(() => import('./CitationPanel')),
};
