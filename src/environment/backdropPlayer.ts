import {
  AMBIENT_FADE_SECONDS,
  AMBIENT_FOLLOW_SECONDS,
  BACKDROP_READY_FADE_SECONDS,
  BLOOM_DRAWN_PX,
  OBJECT_HIT_MIN_PX,
  PARALLAX_DAMPING,
  PARALLAX_MAX_STEP_SECONDS,
  RAIN_FADE_SECONDS,
  RAIN_PIXEL_RATIO_MAX,
} from '../scene/tuning';
import type { MarkerKey } from '../sections/contract';
import { sound } from '../sound/sound';
import type { Quality } from '../visuals/shared';
import {
  ambientCrossing,
  ambientLevel,
  backdropReadiness,
  backdropVisibility,
  backdropWeight,
  BACKDROPS,
  bloomAt,
  coverPoint,
  crossingAt,
  crossingHeld,
  effectsShown,
  FIRST_BACKDROP,
  imagePointAt,
  insidePolygon,
  layerOpacities,
  layerPose,
  motionRunning,
  nightfallAt,
  NO_NIGHTFALL,
  objectBox,
  objectHitBox,
  objectRestBox,
  objectTop,
  panOffset,
  setBackdropReadiness,
  type BackdropObject,
  type LayerPose,
  type ViewBox,
  type ZoneBackdrop,
} from './backdrops';
import { createRain, drawRain, dropCount, stepRain, type DepthGains, type RainField } from './rain';

/**
 * Drives each zone's backdrop from outside React: its layer's opacity follows the zone's weight, its image layers
 * move with the pointer and the walk away while its motion runs (`motionRunning`), and its ambient bed's level
 * follows the weight (`ambientLevel`). The scene calls `followPath` every frame; page, tab and input changes come in
 * as events, since frames stop under an open page and in a hidden tab. Each frame also checks every layer against
 * what it should be, so a layer that lost its styles shows again, even once the camera has settled and nothing on the
 * path changes. A backdrop's objects' light, and whatever else is drawn on its painting (the city's signs and lights),
 * lies on one plane posed as their depth's layer is, so it stays on the object painted there; the scene reads where
 * each one shows (`backdropObjectView`) to pin its marker over it. A backdrop wider than the view pans sideways with
 * the path (`panOffset`), its plane with it.
 *
 * During a crossing between two worlds (`crossingAt`) no more than three full-view layers change from frame to frame:
 * at dawn the two pictures' opacities and the bloom, which is moved and faded, never drawn again; at dusk the stages
 * of the nightfall (`nightfallAt`: the sunset grade, the veil, the rain, the city's lights), each faded only, in turn.
 * Both worlds hold still at rest and their effects pause (`crossingHeld`: into a world arriving at dusk, until its
 * lights have gone into the full picture); a world's effects aren't drawn at all below `EFFECTS_MIN_WEIGHT`.
 *
 * Only the first world's images (the landing's) load before the visitor enters. The others load after, one world at
 * a time in path order (`loadWorlds`); until a world's images have decoded it has no weight, so the path shows as it
 * did before that world had a backdrop, and it fades in once they have.
 */

interface ObjectSlot {
  object: BackdropObject;
  /** The box over the object's rect, inside its backdrop's plane, which holds its light. */
  box: HTMLElement | null;
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
  /** The plane its objects and drawn details lie on, posed as their layer (the objects' depth); the pose last given
   *  it, and the transform it was written as. */
  plane: HTMLElement | null;
  pose: LayerPose;
  planeTransform: string;
  /** Inside the plane: a box the size of its images, in their px, drawn where the cover crop puts them at rest. */
  art: HTMLElement | null;
  /** How far it is panned sideways, in px. */
  pan: number;
  /** Its rain, over every world and the veil (so it can begin in the dark of a crossing): faded with the world's
   *  picture, and during a crossing with the nightfall's rain; the opacity last written. */
  rain: HTMLElement | null;
  rainOpacity: number;
  /** The canvas inside it its drops are drawn on, their field, and each depth's fade (the far and close drops fade in
   *  once a crossing is over); whether the canvas holds drops now. */
  rainCanvas: HTMLCanvasElement | null;
  rainField: RainField | null;
  rainGains: DepthGains;
  rainDrawn: boolean;
  /** Its lights alone, over the veil (`ZoneBackdrop.lights`), posed as its picture; the opacity last written. */
  lights: HTMLImageElement | null;
  lightsOpacity: number;
  lightsTransform: string;
  /** The ambient level last asked for. */
  ambient: number;
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
  objects: (backdrop.objects ?? []).map((object) => ({ object, box: null, outline: null, mask: null })),
  plane: null,
  pose: { x: 0, y: 0, scale: 1 },
  planeTransform: '',
  art: null,
  pan: 0,
  rain: null,
  rainOpacity: -1,
  rainCanvas: null,
  rainField: null,
  rainGains: { far: 0, near: 1, close: 0 },
  rainDrawn: false,
  lights: null,
  lightsOpacity: -1,
  lightsTransform: '',
  ambient: -1,
}));
// A world waiting for its images has no weight until they have decoded.
for (const slot of slots) if (slot.load === 'waiting') setBackdropReadiness(slot.backdrop.zone, 0);

/** The crossing at the last frame's path position. */
let crossing: ReturnType<typeof crossingAt> = null;
/** The bloom over every backdrop, and the opacity and transform last written to it. */
let bloom: HTMLElement | null = null;
let bloomOpacity = -1;
let bloomTransform = '';
/** The nightfall's full-view layers over every backdrop (the sunset grade's two, and the veil), and the opacity last
 *  written to each. */
type NightfallLayer = 'warm' | 'magenta' | 'veil';
const nightfallLayers: Record<NightfallLayer, { el: HTMLElement | null; opacity: number }> = {
  warm: { el: null, opacity: -1 },
  magenta: { el: null, opacity: -1 },
  veil: { el: null, opacity: -1 },
};
/** The nightfall at the last frame's path position. */
let nightfall = NO_NIGHTFALL;
let pageOpen = false;
let tabHidden = false;
let reducedMotion = false;
/** The scene's quality, which sets how many drops the rain has. */
let quality: Quality = 'high';
/** No effect shows until the loading screen has lifted; they fade in then. */
let held = true;
/** Where the pointer is (-1 to 1 across the view each way), and where the parallax has eased to. */
const pointer = { x: 0, y: 0 };
const eased = { x: 0, y: 0 };
const view = { width: 0, height: 0 };

/** Whether a slot holds still for a crossing it is in. */
const inCrossing = (slot: Slot) =>
  crossingHeld(crossing) && crossing !== null && (crossing.from === slot.backdrop.zone || crossing.to === slot.backdrop.zone);

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

/** The depth the slot's plane is posed at: its objects' (all of one backdrop's objects share one), else its first
 *  layer's. */
const planeDepth = ({ backdrop }: Slot) => backdrop.objects?.[0]?.depth ?? backdrop.layers[0].depth;

/** A layer's pose at `depth` for the eased pointer and the slot's weight, panned by the slot's pan; with reduced
 *  motion, its still pose; in a crossing, its pose at rest for the pointer as it was eased when the crossing began. */
function slotPose(slot: Slot, depth: number): LayerPose {
  const { backdrop } = slot;
  const pose = reducedMotion
    ? layerPose(depth, 1, 0, 0, backdrop.horizon, view.width, view.height)
    : layerPose(depth, slot.crossing ? 1 : slot.weight, eased.x, eased.y, backdrop.horizon, view.width, view.height);
  return { ...pose, x: pose.x + slot.pan };
}

const poseTransform = ({ x, y, scale }: LayerPose) => `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;

/** Writes each image's pose, and its plane's. */
function poseImages(slot: Slot) {
  const { backdrop, images, transforms } = slot;
  backdrop.layers.forEach(({ depth }, i) => {
    const image = images[i];
    if (!image) return;
    const transform = poseTransform(slotPose(slot, depth));
    if (transforms[i] === transform) return;
    transforms[i] = transform;
    image.style.transform = transform;
  });
  slot.pose = slotPose(slot, planeDepth(slot));
  const transform = poseTransform(slot.pose);
  if (slot.planeTransform === transform || !slot.plane) return;
  slot.planeTransform = transform;
  slot.plane.style.transform = transform;
}

/** A backdrop that pans has its images drawn in their whole cover-crop box rather than cropped to the view (a crop
 *  would clip them to the view, and the pan would show past their edge), scaled about the same point of the view; so
 *  is its lights image, which lies outside its layer. */
function placeImages(slot: Slot) {
  const images = [...(slot.backdrop.pan ? slot.images : []), ...(slot.lights ? [slot.lights] : [])];
  if (!images.length) return;
  const [left, top] = coverPoint(slot.backdrop, { x: 0, y: 0 }, view.width, view.height);
  const [right, bottom] = coverPoint(slot.backdrop, { x: 1, y: 1 }, view.width, view.height);
  const origin = `${(view.width / 2 - left).toFixed(2)}px ${(slot.backdrop.horizon * view.height - top).toFixed(2)}px`;
  slot.lightsTransform = '';
  for (const image of images) {
    image.style.left = `${left.toFixed(2)}px`;
    image.style.top = `${top.toFixed(2)}px`;
    image.style.width = `${(right - left).toFixed(2)}px`;
    image.style.height = `${(bottom - top).toFixed(2)}px`;
    image.style.transformOrigin = origin;
  }
}

/** Puts each of the slot's objects, and its drawn details, where they stand in the view at rest; its plane's pose
 *  moves them from there. */
function placeObjects(slot: Slot) {
  placeImages(slot);
  if (slot.art) {
    const { width, height } = slot.backdrop.size;
    const [left, top] = coverPoint(slot.backdrop, { x: 0, y: 0 }, view.width, view.height);
    const [right] = coverPoint(slot.backdrop, { x: 1, y: 1 }, view.width, view.height);
    slot.art.style.width = `${width}px`;
    slot.art.style.height = `${height}px`;
    slot.art.style.transform = `translate(${left.toFixed(2)}px, ${top.toFixed(2)}px) scale(${((right - left) / width).toFixed(5)})`;
  }
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

/** Fades an element to an opacity, written only on a change from `last`; hidden at 0. Returns what it wrote. */
function fade(el: HTMLElement | null, value: number, last: number): number {
  const opacity = Number(value.toFixed(3));
  if (!el || opacity === last) return last;
  if ((opacity > 0) !== (last > 0)) el.style.visibility = opacity > 0 ? 'visible' : 'hidden';
  el.style.opacity = String(opacity);
  return opacity;
}

/** The nightfall's grade and veil at path position t: faded only. */
function styleNightfall() {
  for (const name of Object.keys(nightfallLayers) as NightfallLayer[]) {
    const layer = nightfallLayers[name];
    layer.opacity = fade(layer.el, nightfall[name], layer.opacity);
  }
}

/** A slot's rain: shown as its picture is, and during a crossing into it as far as the nightfall's rain has come;
 *  marked as its layer is, except that it falls whenever it shows (a crossing doesn't hold it), so the rain can begin
 *  in the dark before the city moves. */
function styleRain(slot: Slot) {
  const { rain, layer } = slot;
  if (!rain) return;
  const across = crossing !== null && crossing.to === slot.backdrop.zone;
  slot.rainOpacity = fade(rain, slot.opacity * (across ? nightfall.rain : 1), slot.rainOpacity);
  for (const key of ['effects', 'released', 'crossed'] as const) {
    const value = layer?.dataset[key];
    if (rain.dataset[key] !== value) {
      if (value === undefined) delete rain.dataset[key];
      else rain.dataset[key] = value;
    }
  }
  const falls = motionRunning(slot.weight, pageOpen, tabHidden, reducedMotion) ? 'running' : 'stopped';
  if (rain.dataset.motion !== falls) rain.dataset.motion = falls;
}

/** A slot's rain drops, each frame: drawn only while its world's effects are (weight above `EFFECTS_MIN_WEIGHT`) and
 *  it shows, and moved only while it falls (not under a page, nor in a hidden tab). With reduced motion the canvas is
 *  left clear. While a crossing marks it (`data-crossed`) only its near drops are drawn; the far and close ones fade
 *  in over `RAIN_FADE_SECONDS` once it is over. The canvas is the view's size at a pixel ratio of at most
 *  `RAIN_PIXEL_RATIO_MAX`; a change of size or quality makes a new field. */
function rainFrame(slot: Slot, delta: number) {
  const canvas = slot.rainCanvas;
  if (!canvas) return;
  const g = canvas.getContext('2d');
  if (!g) return;
  const clear = () => {
    if (!slot.rainDrawn) return;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    slot.rainDrawn = false;
  };
  if (reducedMotion) return clear();
  if (!effectsShown(slot.weight) || slot.rainOpacity <= 0) return;
  const falls = slot.rain?.dataset.motion === 'running';
  const { width, height } = view;
  if (width === 0 || height === 0) return;
  const ratio = Math.min((typeof window === 'undefined' ? 1 : window.devicePixelRatio) || 1, RAIN_PIXEL_RATIO_MAX);
  const pxWidth = Math.round(width * ratio);
  const pxHeight = Math.round(height * ratio);
  let field = slot.rainField;
  const count = dropCount(width, height, quality);
  if (!field || field.width !== width || field.height !== height || field.count !== count) {
    field = slot.rainField = createRain(width, height, count);
  }
  if (canvas.width !== pxWidth || canvas.height !== pxHeight) {
    canvas.width = pxWidth;
    canvas.height = pxHeight;
  }
  const dt = Math.min(Math.max(delta, 0), PARALLAX_MAX_STEP_SECONDS);
  const crossed = slot.rain?.dataset.crossed !== undefined;
  for (const depth of ['far', 'close'] as const) {
    slot.rainGains[depth] = crossed ? 0 : Math.min(slot.rainGains[depth] + (falls ? dt : 0) / RAIN_FADE_SECONDS, 1);
  }
  // Paused, it keeps the frame it last drew.
  if (!falls && slot.rainDrawn) return;
  if (falls) stepRain(field, dt);
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawRain(g, field, viewToImage(slot), slot.rainGains);
  slot.rainDrawn = true;
}

/** Where each point of the view lands on the slot's painting now, as it is posed (cover crop, pan and parallax). */
function viewToImage(slot: Slot) {
  const pose = slotPose(slot, slot.backdrop.layers[0].depth);
  const a = imagePointAt(slot.backdrop, pose, 0, 0, view.width, view.height);
  const b = imagePointAt(slot.backdrop, pose, view.width, view.height, view.width, view.height);
  return { ax: (b.x - a.x) / view.width, bx: a.x, ay: (b.y - a.y) / view.height, by: a.y };
}

/** A slot's lights: faded with the nightfall, posed and placed as its picture (in its whole cover-crop box). */
function styleLights(slot: Slot) {
  const { lights } = slot;
  if (!lights) return;
  const across = crossing !== null && crossing.to === slot.backdrop.zone;
  slot.lightsOpacity = fade(lights, across ? nightfall.lights : 0, slot.lightsOpacity);
  if (slot.lightsOpacity <= 0) return;
  const transform = poseTransform(slotPose(slot, slot.backdrop.layers[0].depth));
  if (transform === slot.lightsTransform) return;
  slot.lightsTransform = transform;
  lights.style.transform = transform;
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

/** Asks for the slot's ambient bed at its level: following its weight, and into a world at dusk the crossing too. */
function ambient(slot: Slot, seconds: number) {
  const { backdrop, weight } = slot;
  if (!backdrop.ambient) return;
  const level = ambientLevel(weight, pageOpen, backdrop.ambientGain) * ambientCrossing(lastT, backdrop.zone);
  if (level === slot.ambient) return;
  slot.ambient = level;
  sound.ambient(backdrop.ambient, level, seconds, backdrop.ambientFilter);
}

function apply(slot: Slot, seconds: number) {
  const { layer } = slot;
  styleLayer(slot);
  markEffects(slot);
  markReady(slot);
  markMotion(slot);
  if (layer && !held && layer.dataset.released === undefined) layer.dataset.released = '';
  styleRain(slot);
  slot.ambient = -1;
  ambient(slot, seconds);
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

/** Registers a zone's plane (posed as its objects' layer) and the box of its drawn details inside it. */
export function registerBackdropPlane(zone: ZoneBackdrop['zone'], plane: HTMLElement | null, art: HTMLElement | null) {
  const slot = slots.find((s) => s.backdrop.zone === zone);
  if (!slot) return;
  slot.plane = plane;
  slot.art = art;
  slot.planeTransform = '';
  placeObjects(slot);
  poseImages(slot);
}

/** Registers the box of a zone's object, by its place in `objects`. */
export function registerBackdropObject(zone: ZoneBackdrop['zone'], index: number, box: HTMLElement | null) {
  const slot = slots.find((s) => s.backdrop.zone === zone);
  const entry = slot?.objects[index];
  if (!slot || !entry) return;
  entry.box = box;
  placeObjects(slot);
}

/** Registers the bloom drawn over every backdrop during a crossing. */
export function registerBloom(el: HTMLElement | null) {
  bloom = el;
  bloomOpacity = -1;
  bloomTransform = '';
}

/** Registers one of the nightfall's layers drawn over every backdrop during a crossing into a world arriving at
 *  dusk: the sunset grade's warm or magenta layer, or the veil. */
export function registerNightfall(name: NightfallLayer, el: HTMLElement | null) {
  nightfallLayers[name] = { el, opacity: -1 };
}

/** Registers the veil (`registerNightfall('veil', …)`). */
export const registerVeil = (el: HTMLElement | null) => registerNightfall('veil', el);

/** Registers a zone's rain, drawn over every world and the veil, and the canvas inside it its drops are drawn on. */
export function registerRain(zone: ZoneBackdrop['zone'], el: HTMLElement | null, canvas: HTMLCanvasElement | null = null) {
  const slot = slots.find((s) => s.backdrop.zone === zone);
  if (!slot) return;
  slot.rain = el;
  slot.rainOpacity = -1;
  slot.rainCanvas = canvas;
  slot.rainField = null;
  slot.rainDrawn = false;
  styleRain(slot);
}

/** The scene's quality changed: the rain has fewer drops at the lower step. */
export function setRainQuality(next: Quality) {
  quality = next;
}

/** Registers a zone's lights image, drawn over the veil. Its source waits, as its world's images do. */
export function registerLights(zone: ZoneBackdrop['zone'], el: HTMLImageElement | null) {
  const slot = slots.find((s) => s.backdrop.zone === zone);
  if (!slot) return;
  slot.lights = el;
  slot.lightsOpacity = -1;
  slot.lightsTransform = '';
  if (el && slot.load === 'loading') giveSourcesTo([el]);
  placeImages(slot);
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

/** Gives each image in a world's layer that waits for its source (`data-src`, and `data-srcset`) its sources. Returns
 *  them. */
function giveSources(layer: HTMLElement): HTMLImageElement[] {
  return giveSourcesTo(Array.from(layer.querySelectorAll?.<HTMLImageElement>('img[data-src]') ?? []));
}

/** Gives each of these images that waits for its source its sources. Returns those that waited. */
function giveSourcesTo(images: readonly HTMLImageElement[]): HTMLImageElement[] {
  const waiting = images.filter((image) => image.dataset?.src !== undefined);
  for (const image of waiting) {
    // The set first, so the browser picks from it rather than starting on the plain source.
    if (image.dataset.srcset) {
      image.srcset = image.dataset.srcset;
      delete image.dataset.srcset;
    }
    image.src = image.dataset.src!;
    delete image.dataset.src;
  }
  return waiting;
}

/** Loads one world's images (its layers, its objects' glows and outlines, its lights) and waits for all of them to decode. Its
 *  readiness then rises from 0 to 1 over the following frames. One that fails leaves the world as it was. */
async function loadWorld(slot: Slot) {
  slot.load = 'loading';
  const given = [...(slot.layer ? giveSources(slot.layer) : []), ...(slot.lights ? giveSourcesTo([slot.lights]) : [])];
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
/** The path position of the last frame. */
let lastT = 0;

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
  lastT = t;
  fadeIn(delta);
  crossing = crossingAt(t);
  nightfall = nightfallAt(t);
  const weights = slots.map((slot) => backdropWeight(t, slot.backdrop.zone));
  const opacities = layerOpacities(slots.map((slot) => backdropVisibility(t, slot.backdrop.zone)));
  styleBloom(t);
  styleNightfall();
  const k = 1 - Math.exp(-PARALLAX_DAMPING * Math.min(Math.max(delta, 0), PARALLAX_MAX_STEP_SECONDS));
  let eases = false;
  slots.forEach((slot, i) => {
    // Entering or leaving a crossing poses the slot once: at rest within it, as its weight has it after.
    const crossed = inCrossing(slot);
    // Through the whole crossing (`data-crossed`) only its rain's near drops are drawn, and only as far as the
    // nightfall's rain has come; its far and close drops join once the crossing is over.
    const across = crossing !== null && (crossing.from === slot.backdrop.zone || crossing.to === slot.backdrop.zone);
    if (slot.layer && across !== (slot.layer.dataset.crossed !== undefined)) {
      if (across) slot.layer.dataset.crossed = '';
      else delete slot.layer.dataset.crossed;
    }
    const pan = panOffset(slot.backdrop, t, view.width, view.height);
    if (crossed !== slot.crossing || pan !== slot.pan) {
      if (crossed !== slot.crossing && slot.layer) {
        if (crossed) slot.layer.dataset.crossing = '';
        else delete slot.layer.dataset.crossing;
      }
      slot.crossing = crossed;
      slot.pan = pan;
      poseImages(slot);
    }
    if (weights[i] === slot.weight && opacities[i] === slot.opacity) {
      styleLayer(slot);
      markReady(slot);
      markMotion(slot);
      styleRain(slot);
      ambient(slot, AMBIENT_FOLLOW_SECONDS);
    } else {
      slot.weight = weights[i];
      slot.opacity = opacities[i];
      apply(slot, AMBIENT_FOLLOW_SECONDS);
    }
    styleLights(slot);
    rainFrame(slot, delta);
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
      slot.pan = panOffset(slot.backdrop, lastT, view.width, view.height);
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

/** Where a marker's backdrop object shows in the view now (its box, the box that takes presses for it, and its top,
 *  where the marker pins), and whether
 *  it shows at all (its backdrop's picture has any opacity, and its middle column is in the view: a panned world's
 *  buildings come and go). Null for a marker that has no object, or whose world hasn't come far enough in to stand in
 *  for its section. */
export function backdropObjectView(marker: MarkerKey): { box: ViewBox; hit: ViewBox; top: [x: number, y: number]; shown: boolean } | null {
  for (const slot of slots) {
    for (const entry of slot.objects) {
      if (entry.object.marker !== marker) continue;
      if (backdropReadiness(slot.backdrop.zone) < STANDS_IN_FROM_READINESS) return null;
      const { backdrop, opacity, weight, pose } = slot;
      const box = objectBox(backdrop, entry.object, pose, view.width, view.height);
      const middle = box.left + box.width / 2;
      return {
        box,
        hit: objectHitBox(backdrop, entry.object, pose, view.width, view.height),
        top: objectTop(backdrop, entry.object, pose, view.width, view.height),
        shown: opacity > 0 && weight > 0 && middle >= 0 && middle <= view.width,
      };
    }
  }
  return null;
}

/** Whether a marker has an object standing for it in some backdrop. */
export const hasBackdropObject = (marker: MarkerKey) => slots.some((slot) => slot.objects.some((entry) => entry.object.marker === marker));

/** Marks the object standing for the hovered or focused marker, which brightens its glow, and whatever else is drawn
 *  for that marker on its plane (a building's sign); null marks none. */
export function setBackdropHover(marker: MarkerKey | null) {
  const mark = (el: HTMLElement | null, on: boolean) => {
    if (!el) return;
    if (on) el.dataset.hover = '';
    else delete el.dataset.hover;
  };
  for (const slot of slots) {
    for (const { object, box } of slot.objects) mark(box, object.marker === marker);
    for (const el of slot.art?.querySelectorAll<HTMLElement>('[data-marker]') ?? []) mark(el, el.dataset.marker === marker);
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

/** Whether a point of the view (px) lands on one of an object's surfaces (`areas`: its sign or name). */
function onSurface(slot: Slot, entry: ObjectSlot, x: number, y: number): boolean {
  const { areas } = entry.object;
  if (!areas?.length) return false;
  const point = imagePointAt(slot.backdrop, slot.pose, x, y, view.width, view.height);
  return areas.some((area) => insidePolygon(area, point));
}

/** Whether a point of the view (px) lands on one object's outline: on one of its solid pixels, or anywhere in its box
 *  while that is smaller than a touch target. */
function onOutline(slot: Slot, entry: ObjectSlot, x: number, y: number): boolean {
  const box = objectBox(slot.backdrop, entry.object, slot.pose, view.width, view.height);
  const u = (x - box.left) / box.width;
  const v = (y - box.top) / box.height;
  if (u < 0 || v < 0 || u >= 1 || v >= 1) return false;
  if (box.width < OBJECT_HIT_MIN_PX || box.height < OBJECT_HIT_MIN_PX) return true;
  entry.mask ??= buildMask(entry);
  // Until its outline has loaded, nothing counts: the marker button is the way in meanwhile.
  if (!entry.mask) return false;
  const { width, height, solid } = entry.mask;
  return solid[Math.floor(v * height) * width + Math.floor(u * width)] === 1;
}

/**
 * The marker whose object a point of the view (px) lands on, among the backdrops showing. One rule for every object:
 * a press counts on its sign or name surfaces (`areas`) and on its outline. Surfaces come first, so a sign takes a
 * press though another building's outline lies behind it; then outlines, the front one where two overlap (later in
 * its backdrop's `objects`). Null between objects.
 */
export function backdropObjectAt(x: number, y: number): MarkerKey | null {
  const showing = slots.filter((slot) => slot.opacity > 0 && slot.weight > 0);
  for (const test of [onSurface, onOutline]) {
    for (const slot of showing) {
      for (let i = slot.objects.length - 1; i >= 0; i--) if (test(slot, slot.objects[i], x, y)) return slot.objects[i].object.marker;
    }
  }
  return null;
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
