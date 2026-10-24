import type { MarkerKey } from '../sections/contract';

/** Marker buttons by marker, so focus can return to one after its page or panel closes. */
const markers = new Map<MarkerKey, HTMLButtonElement>();

/** The areas that take presses on backdrop objects, by the marker each object stands for. */
const hits = new Map<MarkerKey, HTMLElement>();

export function registerMarker(key: MarkerKey, el: HTMLButtonElement | null) {
  if (el) markers.set(key, el);
  else markers.delete(key);
}

export function registerObjectHit(key: MarkerKey, el: HTMLElement | null) {
  if (el) hits.set(key, el);
  else hits.delete(key);
}

export function focusMarker(key: MarkerKey) {
  markers.get(key)?.focus();
}

export const getMarker = (key: MarkerKey) => markers.get(key);

export const getObjectHit = (key: MarkerKey) => hits.get(key);
