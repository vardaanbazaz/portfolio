import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { PAGE_IDS, type PageId, type PageProps } from './contract';

type PageModule = { default: ComponentType<PageProps> };

/** Each page and its content are their own chunk, fetched the first time the page opens. */
export const pageLoaders: Record<PageId, () => Promise<PageModule>> = {
  about: () => import('./AboutPage'),
  datavista: () => import('./DataVistaPage'),
  'neuroinsight-ai': () => import('./NeuroInsightPage'),
  attrition: () => import('./AttritionPage'),
  kanbanlight: () => import('./KanbanLightPage'),
  'unified-api-ingester': () => import('./IngesterPage'),
  experience: () => import('./ExperiencePage'),
  publications: () => import('./PublicationsPage'),
  contact: () => import('./ContactPage'),
};

export const pages = Object.fromEntries(PAGE_IDS.map((id) => [id, lazy(pageLoaders[id])])) as Record<
  PageId,
  LazyExoticComponent<ComponentType<PageProps>>
>;
