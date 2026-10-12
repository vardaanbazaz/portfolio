import { AMBIENT_FADE_SECONDS, AMBIENT_FOLLOW_SECONDS, PARALLAX_DAMPING, PARALLAX_MAX_STEP_SECONDS } from '../scene/tuning';
import { sound } from '../sound/sound';
import {
  ambientLevel,
  backdropWeight,
  BACKDROPS,
  layerOpacities,
  layerPose,
  motionRunning,
  type ZoneBackdrop,
} from './backdrops';

/**
 * Drives each zone's backdrop from outside React: its layer's opacity follows the zone's weight, its image layers
 * move with the pointer and the walk away while its motion runs (`motionRunning`), and its ambient bed's level
 * follows the weight (`ambientLevel`). The scene calls `followPath` every frame; page, tab and input changes come in
 * as events, since frames stop under an open page and in a hidden tab. Each frame also checks every layer against
 * what it should be, so a layer that lost its styles shows again, even once the camera has settled and nothing on the
 * path changes.
 */

interface Slot {
  backdrop: ZoneBackdrop;
  layer: HTMLElement | null;
  /** One per image layer, in `backdrop.layers` order. */
  images: HTMLImageElement[];
  weight: number;
  /** The layer's own opacity (`layerOpacities`); the dome over it carries the fade. */
  opacity: number;
  /** How many of `images` have decoded. */
  decoded: number;
  /** Whether its motion ran on the last frame, as its `data-motion` says. */
  running: boolean;
  /** The transform last written to each image, so an unchanged one isn't written again. */
  transforms: string[];
}

const slots: Slot[] = BACKDROPS.map((backdrop) => ({
  backdrop,
  layer: null,
  images: [],
  weight: 0,
  opacity: 0,
  decoded: 0,
  running: false,
  transforms: [],
}));
let pageOpen = false;
let tabHidden = false;
let reducedMotion = false;
/** No effect shows until the loading screen has lifted; they fade in then. */
let held = true;
/** Where the pointer is (-1 to 1 across the view each way), and where the parallax has eased to. */
const pointer = { x: 0, y: 0 };
const eased = { x: 0, y: 0 };
const view = { width: 0, height: 0 };

const runs = (slot: Slot) => motionRunning(slot.weight, pageOpen, tabHidden, reducedMotion);

/** Sets a slot's layer to its opacity, shown only above 0. Writes nothing when the layer already has it, so it runs
 *  every frame and a layer whose inline styles were lost or changed is put right on the next one. */
function styleLayer(slot: Slot) {
  const { layer, opacity } = slot;
  if (!layer) return;
  const visibility = opacity > 0 ? 'visible' : 'hidden';
  if (layer.style.visibility !== visibility) layer.style.visibility = visibility;
  // The browser reads "1.000" back as "1", so the two are compared as numbers; a missing opacity reads back as "".
  const value = opacity.toFixed(3);
  if (layer.style.opacity === '' || Number(layer.style.opacity) !== Number(value)) layer.style.opacity = value;
}

/** Writes each image's pose for the eased pointer and the slot's weight; with reduced motion, its still pose. */
function poseImages(slot: Slot) {
  const { backdrop, images, weight, transforms } = slot;
  const still = reducedMotion;
  backdrop.layers.forEach(({ depth }, i) => {
    const image = images[i];
    if (!image) return;
    const pose = still
      ? layerPose(depth, 1, 0, 0, backdrop.horizon, view.width, view.height)
      : layerPose(depth, weight, eased.x, eased.y, backdrop.horizon, view.width, view.height);
    const transform = `translate3d(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px, 0) scale(${pose.scale.toFixed(4)})`;
    if (transforms[i] === transform) return;
    transforms[i] = transform;
    image.style.transform = transform;
  });
}

/** Marks whether the slot's motion runs, which starts or pauses its effects' animations. Only written on a change. */
function markMotion(slot: Slot) {
  const running = runs(slot);
  if (slot.layer && slot.layer.dataset.motion !== (running ? 'running' : 'stopped')) {
    slot.layer.dataset.motion = running ? 'running' : 'stopped';
  }
  if (running === slot.running) return;
  slot.running = running;
  // Stopping with reduced motion shows the still pose at once.
  if (!running && reducedMotion) poseImages(slot);
}

function apply(slot: Slot, fade: number) {
  const { weight, backdrop, layer } = slot;
  styleLayer(slot);
  markMotion(slot);
  if (layer && !held && layer.dataset.released === undefined) layer.dataset.released = '';
  if (backdrop.ambient) sound.ambient(backdrop.ambient, ambientLevel(weight, pageOpen), fade);
}

/** Registers a zone's layer and its image elements (in `layers` order). Counts each image once it has decoded. */
export function registerBackdrop(zone: ZoneBackdrop['zone'], layer: HTMLElement | null, images: readonly (HTMLImageElement | null)[] = []) {
  const slot = slots.find((s) => s.backdrop.zone === zone);
  if (!slot) return;
  slot.layer = layer;
  slot.images = images.filter((image): image is HTMLImageElement => image !== null);
  slot.transforms = [];
  slot.running = false;
  slot.decoded = 0;
  const registered = slot.images;
  for (const image of registered) {
    image.decode().then(
      () => {
        if (slot.images === registered) slot.decoded++;
      },
      () => undefined,
    );
  }
  if (layer) {
    apply(slot, AMBIENT_FOLLOW_SECONDS);
    poseImages(slot);
  }
}

/** Every frame: each backdrop follows its zone's weight at path position t, and its images move while its motion
 *  runs, the parallax easing over `delta` seconds. The ambient bed is only touched when the weight changes; the
 *  layer is checked every frame. */
export function followPath(t: number, delta = 0) {
  const weights = slots.map((slot) => backdropWeight(t, slot.backdrop.zone));
  const opacities = layerOpacities(weights);
  const k = 1 - Math.exp(-PARALLAX_DAMPING * Math.min(Math.max(delta, 0), PARALLAX_MAX_STEP_SECONDS));
  let eases = false;
  slots.forEach((slot, i) => {
    if (weights[i] === slot.weight && opacities[i] === slot.opacity) {
      styleLayer(slot);
      markMotion(slot);
    } else {
      slot.weight = weights[i];
      slot.opacity = opacities[i];
      apply(slot, AMBIENT_FOLLOW_SECONDS);
    }
    if (slot.running) eases = true;
  });
  if (!eases) return;
  eased.x += (pointer.x - eased.x) * k;
  eased.y += (pointer.y - eased.y) * k;
  for (const slot of slots) if (slot.running) poseImages(slot);
}

/** The loading screen has lifted: effects fade in from now on. */
export function releaseBackdrops() {
  held = false;
  for (const slot of slots) apply(slot, AMBIENT_FOLLOW_SECONDS);
}

/** A full page opened or closed: motion stops under it and ambient beds fade out. */
export function setPageOpen(open: boolean) {
  if (open === pageOpen) return;
  pageOpen = open;
  for (const slot of slots) apply(slot, AMBIENT_FADE_SECONDS);
}

/** Stops all motion while `doc` is hidden. Call once at startup. Ambient beds stop with the sound module's own
 *  suspend on hide. */
export function listenVisibility(doc: Pick<Document, 'visibilityState'> & EventTarget) {
  const update = () => {
    tabHidden = doc.visibilityState !== 'visible';
    for (const slot of slots) apply(slot, AMBIENT_FADE_SECONDS);
  };
  doc.addEventListener('visibilitychange', update);
  update();
}

type InputWindow = Pick<Window, 'innerWidth' | 'innerHeight' | 'matchMedia'> & EventTarget;

/** Follows the view's size, the pointer (on screens with a fine, hovering pointer only: no parallax on touch), and
 *  the reduced-motion setting, which can change mid-visit. Call once at startup. */
export function listenInput(win: InputWindow) {
  const resize = () => {
    view.width = win.innerWidth;
    view.height = win.innerHeight;
    for (const slot of slots) poseImages(slot);
  };
  win.addEventListener('resize', resize, { passive: true });
  resize();

  const hovers = win.matchMedia('(hover: hover) and (pointer: fine)');
  win.addEventListener(
    'pointermove',
    (event) => {
      const { pointerType, clientX, clientY } = event as PointerEvent;
      if (pointerType === 'touch' || !hovers.matches || view.width === 0 || view.height === 0) return;
      pointer.x = Math.min(Math.max((clientX / view.width) * 2 - 1, -1), 1);
      pointer.y = Math.min(Math.max((clientY / view.height) * 2 - 1, -1), 1);
    },
    { passive: true },
  );

  const reduce = win.matchMedia('(prefers-reduced-motion: reduce)');
  const update = () => {
    reducedMotion = reduce.matches;
    for (const slot of slots) {
      apply(slot, AMBIENT_FOLLOW_SECONDS);
      // The still pose, at once, whatever the slot was doing: one left pushed away at zero weight included.
      if (reducedMotion) poseImages(slot);
    }
  };
  reduce.addEventListener('change', update);
  update();
}

/** The player's own state for one zone, for the dev readout (?fps). */
export function backdropProbe(zone: ZoneBackdrop['zone']) {
  const slot = slots.find((s) => s.backdrop.zone === zone);
  if (!slot) return null;
  const { layer, images, weight, opacity, decoded, running, backdrop } = slot;
  return { held, pageOpen, tabHidden, reducedMotion, layer, images, weight, opacity, decoded, total: backdrop.layers.length, running };
}

/** How many images the loading screen waits on: every layer of every backdrop. */
export const BACKDROP_IMAGE_COUNT = BACKDROPS.reduce((sum, { layers }) => sum + layers.length, 0);

/** The loading screen's step for each backdrop image: `onDecoded` runs once per image that has loaded and decoded.
 *  A failed image doesn't count; the loading screen's limit covers it. */
export function preloadImages(onDecoded: () => void) {
  for (const { layers } of BACKDROPS) {
    for (const { src } of layers) {
      const image = new Image();
      image.src = src;
      image.decode().then(onDecoded, () => undefined);
    }
  }
}
