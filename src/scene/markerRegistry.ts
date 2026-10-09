import type { MarkerKey } from '../sections/contract';

/** Marker buttons by marker, so focus can return to one after its page or panel closes. */
const markers = new Map<MarkerKey, HTMLButtonElement>();

export function registerMarker(key: MarkerKey, el: HTMLButtonElement | null) {
  if (el) markers.set(key, el);
  else markers.delete(key);
}

export function focusMarker(key: MarkerKey) {
  markers.get(key)?.focus();
}

export const getMarker = (key: MarkerKey) => markers.get(key);
