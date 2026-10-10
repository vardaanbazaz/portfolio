import { AMBIENT_GAIN } from '../scene/tuning';
import landingAmbient from './assets/landing-ambient.m4a';
import landingPoster from './assets/landing-poster.webp';
import landingVideo from './assets/landing.mp4';
import { ZONES, zoneWeight, type ZoneId, type ZoneTable } from './zones';

/** A zone's world: a short looping video behind the transparent canvas, its first frame as a poster, and an
 *  optional ambient sound bed. All bundled; nothing is fetched from anywhere else. */
export interface ZoneBackdrop {
  zone: ZoneId;
  video: string;
  /** The video's first frame, so the fade from poster to video doesn't jump. */
  poster: string;
  ambient?: string;
}

/** At most one per zone. A new world is one more entry here; nothing else changes. */
export const BACKDROPS: readonly ZoneBackdrop[] = [
  { zone: 'landing', video: landingVideo, poster: landingPoster, ambient: landingAmbient },
];

/** Below this a backdrop's weight counts as 0. The camera eases toward the scroll position and never quite arrives,
 *  so without it the landing's weight at About would stay a hair above 0 and its video would never pause. */
export const BACKDROP_MIN_WEIGHT = 1e-3;

/** A backdrop's weight at path position t: its zone's weight, snapped to 0 below `BACKDROP_MIN_WEIGHT`. */
export function backdropWeight(t: number, zone: ZoneId, zones: ZoneTable = ZONES): number {
  const weight = zoneWeight(t, zone, zones);
  return weight < BACKDROP_MIN_WEIGHT ? 0 : weight;
}

/** How much of the drawn sky dome and grid shows at path position t: whatever the backdrops' zones leave. 0 where a
 *  backdrop's zone applies fully (nothing drawn there), 1 where no backdrop's zone has any weight. */
export function worldOpacity(t: number, backdrops: readonly ZoneBackdrop[] = BACKDROPS, zones: ZoneTable = ZONES): number {
  let covered = 0;
  for (const { zone } of backdrops) covered += backdropWeight(t, zone, zones);
  return Math.min(Math.max(1 - covered, 0), 1);
}

/**
 * Each backdrop layer's own opacity, from the backdrops' weights in registry order (later layers on top). The stack
 * then shows each video at exactly its weight, and the dome, drawn over it at `worldOpacity`, fills the rest. Fading
 * a layer by its weight as well would dim it twice and let the page background show through mid-way.
 */
export function layerOpacities(weights: readonly number[]): number[] {
  let sum = 0;
  return weights.map((weight) => {
    sum += weight;
    return sum > 0 ? weight / sum : 0;
  });
}

/** Whether a backdrop's video should be playing. Paused at zero weight, under an open page, in a hidden tab, and
 *  always with Save-Data (which shows the poster only). */
export function shouldPlay(weight: number, pageOpen: boolean, tabHidden: boolean, saveData: boolean): boolean {
  return weight > 0 && !pageOpen && !tabHidden && !saveData;
}

/** Gain of a zone's ambient bed: follows the zone's weight, and goes to 0 under an open page. */
export function ambientLevel(weight: number, pageOpen: boolean, peak: number = AMBIENT_GAIN): number {
  if (pageOpen) return 0;
  return peak * Math.min(Math.max(weight, 0), 1);
}
