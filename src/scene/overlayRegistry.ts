import type { SectionId } from '../sections/contract';

/** The landing text and section captions: plain DOM over the canvas, faded every frame by OverlayTracker. */
let landing: HTMLElement | null = null;
const captions = new Map<SectionId, HTMLElement>();

export function registerLanding(el: HTMLElement | null) {
  landing = el;
}

export function registerCaption(id: SectionId, el: HTMLElement | null) {
  if (el) captions.set(id, el);
  else captions.delete(id);
}

export const getLanding = () => landing;
export const getCaption = (id: SectionId) => captions.get(id);
