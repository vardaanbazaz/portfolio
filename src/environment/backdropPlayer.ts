import { AMBIENT_FADE_SECONDS, AMBIENT_FOLLOW_SECONDS, BACKDROP_PLAY_RETRY_SECONDS } from '../scene/tuning';
import { sound } from '../sound/sound';
import { ambientLevel, backdropWeight, BACKDROPS, layerOpacities, shouldPlay, type ZoneBackdrop } from './backdrops';

/**
 * Drives each zone's backdrop from outside React: its layer's opacity follows the zone's weight, its video plays only
 * while it should (`shouldPlay`), and its ambient bed's level follows the weight (`ambientLevel`). The scene calls
 * `followPath` every frame; page and tab changes come in as events, since frames stop under an open page and in a
 * hidden tab. Each frame also checks every video against what it should be doing, so one the browser paused or
 * refused to play starts again even once the camera has settled and nothing on the path changes.
 */

interface Slot {
  backdrop: ZoneBackdrop;
  layer: HTMLElement | null;
  video: HTMLVideoElement | null;
  weight: number;
  /** The layer's own opacity (`layerOpacities`); the dome over it carries the fade. */
  opacity: number;
  /** A play() is under way; no other is started until it settles. */
  starting: boolean;
  /** No play() before this time (performance.now()), after the browser refused the last one. */
  retryAt: number;
}

const slots: Slot[] = BACKDROPS.map((backdrop) => ({
  backdrop,
  layer: null,
  video: null,
  weight: 0,
  opacity: 0,
  starting: false,
  retryAt: 0,
}));
let pageOpen = false;
let tabHidden = false;
/** No video loads or plays until the loading screen has lifted, so none competes with the steps it waits on. */
let held = true;

/** The visitor asked the browser to save data: posters only, and no video is fetched. */
export const SAVE_DATA = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

/** Plays or pauses a slot's video to match what it should be doing. Cheap when it already does, so it runs every
 *  frame. A refused play() is tried again after a pause; one cut short by pause() (an AbortError) is not a refusal. */
function syncVideo(slot: Slot) {
  const { video, weight } = slot;
  if (!video) return;
  if (!held && shouldPlay(weight, pageOpen, tabHidden, SAVE_DATA)) {
    if (!video.paused || slot.starting || performance.now() < slot.retryAt) return;
    slot.starting = true;
    video.play().then(
      () => {
        slot.starting = false;
      },
      (error: unknown) => {
        slot.starting = false;
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          slot.retryAt = performance.now() + BACKDROP_PLAY_RETRY_SECONDS * 1000;
        }
      },
    );
  } else if (!video.paused) {
    video.pause();
  }
}

function apply(slot: Slot, fade: number) {
  const { layer, weight, opacity, backdrop } = slot;
  if (layer) {
    const visibility = opacity > 0 ? 'visible' : 'hidden';
    if (layer.style.visibility !== visibility) layer.style.visibility = visibility;
    layer.style.opacity = opacity.toFixed(3);
  }
  syncVideo(slot);
  if (backdrop.ambient) sound.ambient(backdrop.ambient, ambientLevel(weight, pageOpen), fade);
}

/** Registers a zone's layer, and its video unless Save-Data left it out. */
export function registerBackdrop(zone: ZoneBackdrop['zone'], layer: HTMLElement | null, video: HTMLVideoElement | null) {
  const slot = slots.find((s) => s.backdrop.zone === zone);
  if (!slot) return;
  slot.layer = layer;
  slot.video = video;
  if (layer) apply(slot, AMBIENT_FOLLOW_SECONDS);
}

/** Every frame: each backdrop follows its zone's weight at path position t. The layer and the ambient bed are only
 *  touched when the weight changes; the video is checked every frame. */
export function followPath(t: number) {
  const weights = slots.map((slot) => backdropWeight(t, slot.backdrop.zone));
  const opacities = layerOpacities(weights);
  slots.forEach((slot, i) => {
    if (weights[i] === slot.weight && opacities[i] === slot.opacity && slot.layer?.style.opacity) {
      syncVideo(slot);
      return;
    }
    slot.weight = weights[i];
    slot.opacity = opacities[i];
    apply(slot, AMBIENT_FOLLOW_SECONDS);
  });
}

/** The loading screen has lifted: videos may load and play from now on. */
export function releaseBackdrops() {
  held = false;
  for (const slot of slots) apply(slot, AMBIENT_FOLLOW_SECONDS);
}

/** A full page opened or closed: videos pause under it and ambient beds fade out. */
export function setPageOpen(open: boolean) {
  if (open === pageOpen) return;
  pageOpen = open;
  for (const slot of slots) apply(slot, AMBIENT_FADE_SECONDS);
}

/** Pauses every video while `doc` is hidden. Call once at startup. Ambient beds stop with the sound module's own
 *  suspend on hide. */
export function listenVisibility(doc: Pick<Document, 'visibilityState'> & EventTarget) {
  const update = () => {
    tabHidden = doc.visibilityState !== 'visible';
    for (const slot of slots) apply(slot, AMBIENT_FADE_SECONDS);
  };
  doc.addEventListener('visibilitychange', update);
  update();
}

/** The loading screen's step for each poster: `onLoaded` runs once per poster that arrives. A failed poster doesn't
 *  count; the loading screen's limit covers it. */
export function preloadPosters(onLoaded: () => void) {
  for (const { poster } of BACKDROPS) {
    const image = new Image();
    image.onload = onLoaded;
    image.src = poster;
  }
}
