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
  education: 'Education',
  coursework: 'Coursework',
  location: 'Location',
  links: 'Links',
  email: 'Email',
  copyEmail: 'Copy email',
  copied: 'Copied.',
  copyFailed: 'Copy failed. The address is selected; copy it with your keyboard.',
  mailApp: 'Open in mail app',
};
