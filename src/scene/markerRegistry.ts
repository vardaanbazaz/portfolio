import type { StopId } from '../stops/contract';

/** Marker buttons by stop, so focus can return to one after its page closes. */
const markers = new Map<StopId, HTMLButtonElement>();

export function registerMarker(id: StopId, el: HTMLButtonElement | null) {
  if (el) markers.set(id, el);
  else markers.delete(id);
}

export function focusMarker(id: StopId) {
  markers.get(id)?.focus();
}

export const getMarker = (id: StopId) => markers.get(id);
