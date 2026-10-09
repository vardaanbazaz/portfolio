import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { PANEL_ITEMS, type PanelItemId, type PanelProps } from '../pages/contract';

type PanelModule = { default: ComponentType<PanelProps> };

/** Each panel and its content are their own chunk, fetched the first time a panel of that kind opens. */
export const panelLoaders: Record<PanelItemId, () => Promise<PanelModule>> = {
  drdo: () => import('./RolePanel'),
  agrybin: () => import('./RolePanel'),
  'web-page-linker': () => import('./CitationPanel'),
};

export const panels = Object.fromEntries(PANEL_ITEMS.map((id) => [id, lazy(panelLoaders[id])])) as Record<
  PanelItemId,
  LazyExoticComponent<ComponentType<PanelProps>>
>;
