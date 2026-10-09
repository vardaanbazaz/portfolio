import type { StopId } from './stops/contract';

/** URL path for each stop's page. The one place paths are defined. */
export const STOP_PATHS: Record<StopId, string> = {
  datavista: '/projects/datavista',
  publications: '/publications',
  experience: '/experience',
};

/** The stop whose page a path opens, or null for `/` and unknown paths.
 *  Ignores a trailing slash and letter case, matching React Router's default matching. */
export function stopForPath(pathname: string): StopId | null {
  const path = (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname).toLowerCase();
  for (const [id, stopPath] of Object.entries(STOP_PATHS) as [StopId, string][]) {
    if (stopPath === path) return id;
  }
  return null;
}
