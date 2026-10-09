import { SITE_NAME } from '../content/scene';

/** Interface labels only. Facts and scene text live in `src/content/`. */
export const UI = {
  openPage: (label: string) => `Open ${label}`,
  back: 'Back',
  mute: 'Mute',
  menu: 'Menu',
  menuLabel: 'Sections',
  loading: 'Loading',
  pageTitle: (label: string) => `${label} · ${SITE_NAME}`,
};
