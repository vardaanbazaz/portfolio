import type { StopId } from '../stops/contract';

/** Interface labels only. Facts live in the content file. */
export const SITE_NAME = 'Vardaan';

export const STOP_LABELS: Record<StopId, string> = {
  datavista: 'DataVista',
  publications: 'Publications',
  experience: 'Experience',
};

export const UI = {
  openStop: (label: string) => `Open ${label}`,
  close: 'Close',
  placeholder: 'Placeholder',
  mute: 'Mute',
  pageTitle: (label: string) => `${label} · ${SITE_NAME}`,
};
