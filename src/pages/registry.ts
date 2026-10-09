import { lazyChunk, type LazyChunk } from '../ui/chunk';
import type { PageId, PageProps } from './contract';

/** Each page and its content are their own chunk, kept out of the first download. It is fetched in the background
 *  (on the scene site as soon as the scene's code has loaded, on the HTML site once it is idle), or sooner when its
 *  marker is hovered, focused or pressed (see `src/preload.ts`). */
export const pages: Record<PageId, LazyChunk<PageProps>> = {
  about: lazyChunk(() => import('./AboutPage')),
  datavista: lazyChunk(() => import('./DataVistaPage')),
  'neuroinsight-ai': lazyChunk(() => import('./NeuroInsightPage')),
  attrition: lazyChunk(() => import('./AttritionPage')),
  kanbanlight: lazyChunk(() => import('./KanbanLightPage')),
  'unified-api-ingester': lazyChunk(() => import('./IngesterPage')),
  experience: lazyChunk(() => import('./ExperiencePage')),
  publications: lazyChunk(() => import('./PublicationsPage')),
  contact: lazyChunk(() => import('./ContactPage')),
};
