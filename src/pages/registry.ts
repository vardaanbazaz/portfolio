import type { ComponentType } from 'react';
import type { StopId } from '../stops/contract';
import { placeholderPage, type PageProps } from './PlaceholderPage';

export const pages: Record<StopId, ComponentType<PageProps>> = {
  datavista: placeholderPage('datavista'),
  publications: placeholderPage('publications'),
  experience: placeholderPage('experience'),
};
