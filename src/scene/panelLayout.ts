import { useSyncExternalStore } from 'react';
import { NARROW_VIEWPORT_PX } from './tuning';

/** Below this width a panel sits in the bottom half of the screen with its box in the top half; otherwise the panel
 *  is on the right and its box on the left. A media query, not the canvas size, so it agrees with the `.panel` rules
 *  in `src/index.css` (the canvas is narrower by the scrollbar's width). */
const STACKED_QUERY = `(max-width: ${NARROW_VIEWPORT_PX - 1}px)`;

function subscribe(onChange: () => void) {
  const query = window.matchMedia(STACKED_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** Whether a panel is stacked below its box. Updates when the viewport crosses the width, so an open panel re-frames. */
export function usePanelStacked(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(STACKED_QUERY).matches);
}
