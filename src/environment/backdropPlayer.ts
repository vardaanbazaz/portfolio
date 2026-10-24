import {
  AMBIENT_FADE_SECONDS,
  AMBIENT_FOLLOW_SECONDS,
  BACKDROP_READY_FADE_SECONDS,
  BLOOM_DRAWN_PX,
  OBJECT_HIT_MIN_PX,
  PARALLAX_DAMPING,
  PARALLAX_MAX_STEP_SECONDS,
} from '../scene/tuning';
import type { MarkerKey } from '../sections/contract';
import { sound } from '../sound/sound';
import {
  ambientLevel,
  backdropReadiness,
  backdropVisibility,
  backdropWeight,
  BACKDROPS,
  bloomAt,
  crossingAt,
  effectsShown,
  FIRST_BACKDROP,
  layerOpacities,
  layerPose,
  motionRunning,
  objectBox,
  objectRestBox,
  objectTop,
  setBackdropReadiness,
  type BackdropObject,
  type LayerPose,
  type ViewBox,
  type ZoneBackdrop,
} from './backdrops';

/**
 * Drives each zone's backdrop from outside React: its layer's opacity follows the zone's weight, its image layers
 * move with the pointer and the walk away while its motion runs (`motionRunning`), and its ambient bed's level
 * follows the weight (`ambientLevel`). The scene calls `followPath` every frame; page, tab and input changes come in
 * as events, since frames stop under an open page and in a hidden tab. Each frame also checks every layer against
 * what it should be, so a layer that lost its styles shows again, even once the camera has settled and nothing on the
 * path changes. A backdrop's objects' light lies on a plane posed as their depth's layer is, so it stays on the
 * object painted there; the scene reads where each one shows (`backdropObjectView`) to pin its marker over it.
 *
 * During a crossing between two worlds (`crossingAt`) only three things change from frame to frame: the two pictures'
 * opacities and the bloom, which is moved and faded, never drawn again. Both worlds hold still at rest and their
 * effects pause; a world's effects aren't drawn at all below `EFFECTS_MIN_WEIGHT`.
 *
 * Only the first world's images (the landing's) load before the visitor enters. The others load after, one world at
 * a time in path order (`loadWorlds`); until a world's images have decoded it has no weight, so the path shows as it
 * did before that world had a backdrop, and it fades in once they have.
 */

/** One backdrop object's elements: the plane posed as its layer, and the box inside it over the object's rect, which
 *  holds its light. */
export interface ObjectElements {
  plane: HTMLElement | null;
  box: HTMLElement | null;
}

interface ObjectSlot extends ObjectElements {
  object: BackdropObject;
  /** The pose last written to its plane, and the transform it was written as. */
  pose: LayerPose;
  transform: string;
  /** Its outline, loaded, and which of its pixels are solid, for presses: built once that has loaded. */
  outline: HTMLImageElement | null;
  mask: { width: number; height: number; solid: Uint8Array } | null;
}

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
  /** Whether it was in a crossing on the last frame, where it holds still at rest. */
  crossing: boolean;
  /** Where its images are: the first world's load at once; the others wait for `loadWorlds`. */
  load: 'waiting' | 'loading' | 'decoded' | 'failed';
  /** The transform last written to each image, so an unchanged one isn't written again. */
  transforms: string[];
  objects: ObjectSlot[];
}

const slots: Slot[] = BACKDROPS.map((backdrop) => ({
  backdrop,
  layer: null,
  images: [],
  weight: 0,
  opacity: 0,
  decoded: 0,
  running: false,
  crossing: false,
  load: backdrop === FIRST_BACKDROP ? 'decoded' : 'waiting',
  transforms: [],
  objects: (backdrop.objects ?? []).map((object) => ({
    object,
    plane: null,
    box: null,
    pose: { x: 0, y: 0, scale: 1 },
    transform: '',
    outline: null,
    mask: null,
  })),
}));
// A world waiting for its images has no weight until they have decoded.
for (const slot of slots) if (slot.load === 'waiting') setBackdropReadiness(slot.backdrop.zone, 0);

/** The crossing at the last frame's path position. */
let crossing: ReturnType<typeof crossingAt> = null;
/** The bloom over every backdrop, and the opacity and transform last written to it. */
let bloom: HTMLElement | null = null;
let bloomOpacity = -1;
let bloomTransform = '';
let pageOpen = false;
let tabHidden = false;
let reducedMotion = false;
/** No effect shows until the loading screen has lifted; they fade in then. */
let held = true;
/** Where the pointer is (-1 to 1 across the view each way), and where the parallax has eased to. */
const pointer = { x: 0, y: 0 };
const eased = { x: 0, y: 0 };
const view = { width: 0, height: 0 };

const inCrossing = (slot: Slot) => crossing !== null && (crossing.from === slot.backdrop.zone || crossing.to === slot.backdrop.zone);

const runs = (slot: Slot) => motionRunning(slot.weight, pageOpen, tabHidden, reducedMotion, inCrossing(slot));

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

/** Writes each image's pose for the eased pointer and the slot's weight; with reduced motion, its still pose; in a
 *  crossing, its pose at rest for the pointer as it was eased when the crossing began. */
function poseImages(slot: Slot) {
  const { backdrop, images, transforms } = slot;
  const still = reducedMotion;
  const weight = slot.crossing ? 1 : slot.weight;
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
  for (const entry of slot.objects) {
    const { depth } = entry.object;
    entry.pose = still
      ? layerPose(depth, 1, 0, 0, backdrop.horizon, view.width, view.height)
      : layerPose(depth, weight, eased.x, eased.y, backdrop.horizon, view.width, view.height);
    const { x, y, scale } = entry.pose;
    const transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    if (entry.transform === transform || !entry.plane) continue;
    entry.transform = transform;
    entry.plane.style.transform = transform;
  }
}

/** Puts each of the slot's objects where it stands in the view at rest; its plane's pose moves it from there. */
function placeObjects(slot: Slot) {
  for (const { object, box } of slot.objects) {
    if (!box) continue;
    const rest = objectRestBox(slot.backdrop, object, view.width, view.height);
    box.style.left = `${rest.left.toFixed(2)}px`;
    box.style.top = `${rest.top.toFixed(2)}px`;
    box.style.width = `${rest.width.toFixed(2)}px`;
    box.style.height = `${rest.height.toFixed(2)}px`;
  }
}

/** The bloom at path position t: moved and scaled by transform (it is drawn once, `BLOOM_DRAWN_PX` square, about its
 *  centre) and faded, written only on a change; hidden at 0. */
function styleBloom(t: number) {
  const state = bloomAt(t, view.width, view.height);
  const opacity = state ? Number(state.opacity.toFixed(3)) : 0;
  if (!bloom) return;
  if (opacity !== bloomOpacity) {
    if ((opacity > 0) !== (bloomOpacity > 0)) bloom.style.visibility = opacity > 0 ? 'visible' : 'hidden';
    bloomOpacity = opacity;
    bloom.style.opacity = String(opacity);
  }
  if (!state || opacity === 0) return;
  const half = BLOOM_DRAWN_PX / 2;
  const transform = `translate3d(${(state.x - half).toFixed(1)}px, ${(state.y - half).toFixed(1)}px, 0) scale(${((2 * state.radius) / BLOOM_DRAWN_PX).toFixed(4)})`;
  if (transform === bloomTransform) return;
  bloomTransform = transform;
  bloom.style.transform = transform;
}

/** Marks a world whose images are in and that has fully faded in (`data-ready`), for the tests. Only written on a
 *  change. */
function markReady(slot: Slot) {
  const { layer, load, backdrop } = slot;
  if (!layer) return;
  const ready = load === 'decoded' && backdropReadiness(backdrop.zone) === 1;
  if (ready === (layer.dataset.ready !== undefined)) return;
  if (ready) layer.dataset.ready = '';
  else delete layer.dataset.ready;
}

/** Marks whether a slot's effects are drawn at all (`effectsShown`). Only written on a change. */
function markEffects(slot: Slot) {
  const value = effectsShown(slot.weight) ? 'on' : 'off';
  if (slot.layer && slot.layer.dataset.effects !== value) slot.layer.dataset.effects = value;
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
  markEffects(slot);
  markReady(slot);
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
  // A world still waiting has no sources yet; `loadWorld` counts its images when it gives them theirs.
  if (slot.load !== 'waiting') countDecoded(slot, slot.images);
  if (slot.load === 'loading' && layer) giveSources(layer);
  if (layer) {
    measure();
    apply(slot, AMBIENT_FOLLOW_SECONDS);
    placeObjects(slot);
    poseImages(slot);
  }
}

/** Registers the elements of a zone's object, by its place in `objects`. */
export function registerBackdropObject(zone: ZoneBackdrop['zone'], index: number, elements: ObjectElements) {
  const entry = slots.find((s) => s.backdrop.zone === zone)?.objects[index];
  if (!entry) return;
  Object.assign(entry, elements, { transform: '' });
  const slot = slots.find((s) => s.backdrop.zone === zone)!;
  placeObjects(slot);
  poseImages(slot);
}

/** Registers the bloom drawn over every backdrop during a crossing. */
export function registerBloom(el: HTMLElement | null) {
  bloom = el;
  bloomOpacity = -1;
  bloomTransform = '';
}

/** Counts each of `images` once it has decoded, while they are still the slot's. */
function countDecoded(slot: Slot, images: readonly HTMLImageElement[]) {
  const registered = slot.images;
  for (const image of images) {
    image.decode().then(
      () => {
        if (slot.images === registered) slot.decoded++;
      },
      () => undefined,
    );
  }
}

/** Gives each image in a world's layer that waits for its source (`data-src`) its source. Returns them. */
function giveSources(layer: HTMLElement): HTMLImageElement[] {
  const waiting = Array.from(layer.querySelectorAll?.<HTMLImageElement>('img[data-src]') ?? []);
  for (const image of waiting) {
    image.src = image.dataset.src!;
    delete image.dataset.src;
  }
  return waiting;
}

/** Loads one world's images (its layers, its objects' glows and outlines) and waits for all of them to decode. Its
 *  readiness then rises from 0 to 1 over the following frames. One that fails leaves the world as it was. */
async function loadWorld(slot: Slot) {
  slot.load = 'loading';
  const given = slot.layer ? giveSources(slot.layer) : [];
  const images = new Set<{ decode: () => Promise<void> }>([...slot.images, ...given]);
  for (const entry of slot.objects) {
    const outline = loadOutline(entry);
    if (outline) images.add(outline);
  }
  countDecoded(slot, slot.images);
  const results = await Promise.allSettled([...images].map((image) => image.decode()));
  slot.load = results.every((result) => result.status === 'fulfilled') ? 'decoded' : 'failed';
}

let worldsLoading = false;

/** Loads every world but the first in the background, one at a time in path order, so the nearest comes in first.
 *  Call once the visitor has entered. Only the first call does anything. */
export async function loadWorlds() {
  if (worldsLoading) return;
  worldsLoading = true;
  for (const slot of slots) if (slot.load === 'waiting') await loadWorld(slot);
}

/** Readiness rises over `delta` seconds for each world whose images have decoded. */
function fadeIn(delta: number) {
  for (const { backdrop, load } of slots) {
    if (load !== 'decoded') continue;
    const ready = backdropReadiness(backdrop.zone);
    if (ready < 1) setBackdropReadiness(backdrop.zone, ready + Math.min(Math.max(delta, 0), PARALLAX_MAX_STEP_SECONDS) / BACKDROP_READY_FADE_SECONDS);
  }
}

/** The view's size, as the backdrops are drawn: their layer's own box where one is in the page, which leaves out a
 *  scrollbar the window's inner size counts. */
function measure(win: Pick<Window, 'innerWidth' | 'innerHeight'> | null = typeof window === 'undefined' ? null : window) {
  const layer = slots.find((slot) => slot.layer)?.layer;
  const width = layer?.clientWidth || win?.innerWidth || view.width;
  const height = layer?.clientHeight || win?.innerHeight || view.height;
  view.width = width;
  view.height = height;
}

/** Every frame: each backdrop follows its zone's weight at path position t, and its images move while its motion
 *  runs, the parallax easing over `delta` seconds. The ambient bed is only touched when the weight changes; the
 *  layer is checked every frame. */
export function followPath(t: number, delta = 0) {
  fadeIn(delta);
  crossing = crossingAt(t);
  const weights = slots.map((slot) => backdropWeight(t, slot.backdrop.zone));
  const opacities = layerOpacities(slots.map((slot) => backdropVisibility(t, slot.backdrop.zone)));
  styleBloom(t);
  const k = 1 - Math.exp(-PARALLAX_DAMPING * Math.min(Math.max(delta, 0), PARALLAX_MAX_STEP_SECONDS));
  let eases = false;
  slots.forEach((slot, i) => {
    // Entering or leaving a crossing poses the slot once: at rest within it, as its weight has it after.
    const crossed = inCrossing(slot);
    if (crossed !== slot.crossing) {
      slot.crossing = crossed;
      if (slot.layer) {
        if (crossed) slot.layer.dataset.crossing = '';
        else delete slot.layer.dataset.crossing;
      }
      poseImages(slot);
    }
    if (weights[i] === slot.weight && opacities[i] === slot.opacity) {
      styleLayer(slot);
      markReady(slot);
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
    measure(win);
    bloomTransform = '';
    for (const slot of slots) {
      placeObjects(slot);
      poseImages(slot);
    }
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

/** A world stands in for its section once at least this far faded in; before that its section shows as it did. */
const STANDS_IN_FROM_READINESS = 0.5;

/** Where a marker's backdrop object shows in the view now (its box, and its top, where the marker pins), and whether
 *  it shows at all (its backdrop's picture has any opacity). Null for a marker that has no object, or whose world
 *  hasn't come far enough in to stand in for its section. */
export function backdropObjectView(marker: MarkerKey): { box: ViewBox; top: [x: number, y: number]; shown: boolean } | null {
  for (const slot of slots) {
    for (const entry of slot.objects) {
      if (entry.object.marker !== marker) continue;
      if (backdropReadiness(slot.backdrop.zone) < STANDS_IN_FROM_READINESS) return null;
      const { backdrop, opacity, weight } = slot;
      return {
        box: objectBox(backdrop, entry.object, entry.pose, view.width, view.height),
        top: objectTop(backdrop, entry.object, entry.pose, view.width, view.height),
        shown: opacity > 0 && weight > 0,
      };
    }
  }
  return null;
}

/** Whether a marker has an object standing for it in some backdrop. */
export const hasBackdropObject = (marker: MarkerKey) => slots.some((slot) => slot.objects.some((entry) => entry.object.marker === marker));

/** Marks the object standing for the hovered or focused marker, which brightens its glow; null marks none. */
export function setBackdropHover(marker: MarkerKey | null) {
  for (const slot of slots) {
    for (const { object, box } of slot.objects) {
      if (!box) continue;
      if (object.marker === marker) box.dataset.hover = '';
      else delete box.dataset.hover;
    }
  }
}

/** Alpha (0 to 255) at or above which an outline pixel counts as solid. */
const MASK_SOLID_ALPHA = 128;

/** Starts loading an object's outline, once, and returns it. */
function loadOutline(entry: ObjectSlot) {
  if (!entry.outline && typeof Image !== 'undefined') {
    entry.outline = new Image();
    entry.outline.src = entry.object.outline;
  }
  return entry.outline;
}

/** Which pixels of the object's outline are solid. Null until it has loaded, or where no 2D canvas is to be had. */
function buildMask(entry: ObjectSlot): ObjectSlot['mask'] {
  const image = entry.outline;
  if (!image || !image.complete || !image.naturalWidth || typeof document === 'undefined') return null;
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  // Off the page, as the stars' canvas is: the scene's canvas stays the page's only one.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d', { willReadFrequently: true });
  if (!g) return null;
  g.drawImage(image, 0, 0);
  const alpha = g.getImageData(0, 0, width, height).data;
  const solid = new Uint8Array(width * height);
  for (let i = 0; i < solid.length; i++) solid[i] = alpha[i * 4 + 3] >= MASK_SOLID_ALPHA ? 1 : 0;
  return { width, height, solid };
}

/** Whether a point of the view (px) lands on a marker's object: on one of its outline's solid pixels, or anywhere in
 *  its box while that is smaller than a touch target. */
export function backdropObjectHit(marker: MarkerKey, x: number, y: number): boolean {
  for (const slot of slots) {
    for (const entry of slot.objects) {
      if (entry.object.marker !== marker) continue;
      const box = objectBox(slot.backdrop, entry.object, entry.pose, view.width, view.height);
      if (box.width < OBJECT_HIT_MIN_PX || box.height < OBJECT_HIT_MIN_PX) return true;
      const u = (x - box.left) / box.width;
      const v = (y - box.top) / box.height;
      if (u < 0 || v < 0 || u >= 1 || v >= 1) return false;
      entry.mask ??= buildMask(entry);
      // Until its outline has loaded, nothing counts: the marker button is the way in meanwhile.
      if (!entry.mask) return false;
      const { width, height, solid } = entry.mask;
      return solid[Math.floor(v * height) * width + Math.floor(u * width)] === 1;
    }
  }
  return false;
}

/** The player's own state for one zone, for the dev readout (?fps). */
export function backdropProbe(zone: ZoneBackdrop['zone']) {
  const slot = slots.find((s) => s.backdrop.zone === zone);
  if (!slot) return null;
  const { layer, images, weight, opacity, decoded, running, backdrop, load } = slot;
  const ready = backdropReadiness(zone);
  return { held, pageOpen, tabHidden, reducedMotion, layer, images, weight, opacity, decoded, total: backdrop.layers.length, running, load, ready };
}

/** The images the loading screen waits on: the first world's layers and its objects' masks. Every other world's load
 *  after the visitor has entered (`loadWorlds`). */
const FIRST_IMAGES = [
  ...FIRST_BACKDROP.layers.map(({ src }) => src),
  ...(FIRST_BACKDROP.objects ?? []).flatMap(({ outline, glow }) => [outline, ...(glow ? [glow.src] : [])]),
];

/** How many images the loading screen waits on. */
export const BACKDROP_IMAGE_COUNT = FIRST_IMAGES.length;

/** The loading screen's step for each of the first world's images: `onDecoded` runs once per image that has loaded
 *  and decoded. A failed image doesn't count; the loading screen's limit covers it. */
export function preloadImages(onDecoded: () => void) {
  for (const src of FIRST_IMAGES) {
    const image = new Image();
    image.src = src;
    image.decode().then(onDecoded, () => undefined);
  }
}
