import type { PageId } from '../pages/contract';

/** Marker buttons by page, so focus can return to one after its page closes. */
const markers = new Map<PageId, HTMLButtonElement>();

export function registerMarker(id: PageId, el: HTMLButtonElement | null) {
  if (el) markers.set(id, el);
  else markers.delete(id);
}

export function focusMarker(id: PageId) {
  markers.get(id)?.focus();
}

export const getMarker = (id: PageId) => markers.get(id);
