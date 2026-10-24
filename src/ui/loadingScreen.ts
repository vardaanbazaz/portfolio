import {
  GATE_BORDER_PX,
  GATE_ENERGY_BORDER_OPACITY,
  GATE_ENERGY_HALF_LIFE_SECONDS,
  GATE_ENERGY_MAX_SCALE,
  GATE_ENERGY_PER_KEY,
  GATE_ENERGY_PER_PX,
  GATE_ENERGY_REST,
  GATE_ENTER_FONT_PX,
  GATE_ENTER_PADDING_PX,
  GATE_ENTER_SUBLINE_FONT_PX,
  GATE_ENTER_WIDTH_PX,
  GATE_FADE_IN_SECONDS,
  GATE_FOCUS_RING_OFFSET_PX,
  GATE_FOCUS_RING_PX,
  GATE_GAP_PX,
  GATE_ICON_GAP_PX,
  GATE_ICON_PX,
  GATE_QUIET_FONT_PX,
  GATE_QUIET_PADDING_X_PX,
  GATE_RADIUS_PX,
  GATE_SIDE_GUTTER_PX,
  GATE_TARGET_MIN_PX,
  GATE_TOUCH_SLOP_PX,
  GATE_UNDERLINE_OFFSET_PX,
  GATE_WHEEL_LINE_PX,
  LOADING_SCREEN_FADE_SECONDS,
  LOADING_SCREEN_LIMIT_SECONDS,
} from '../scene/tuning';
import { UI } from './strings';

/**
 * The loading screen is plain HTML and CSS in `index.html`, so it shows before any script runs. While it is up, the
 * page can't scroll (the `booting` class on <html>) and everything behind it is inert. This module fills its bar and
 * lifts it; it imports nothing 3D, so the HTML site can use it too.
 *
 * Its progress is real: on the scene site, one step for the scene's code, one for the scene's first frame, one per
 * image of the landing's backdrop decoded (the other worlds' images load once the visitor is in), and one per page and
 * panel chunk fetched. Sound never counts. It lifts once the scene has
 * drawn and every image has decoded and every chunk has arrived, or at the limit in
 * `tuning.ts` after the first frame. On a direct page link it lifts as soon as that page has rendered instead.
 *
 * On the scene site (not on a direct page link) it doesn't lift by itself: at that point its bar gives way to the
 * entry gate, Enter (with sound) and Enter without sound, and the visitor's press on one lifts it. That press is what
 * lets the browser start sound. Until then the page stays locked and nothing scrolls.
 */

const SCREEN_ID = 'loading-screen';

let total = 0;
let done = 0;
let chunksLeft = Infinity;
let drawn = false;
let forPage = false;
let lifted = false;
let limitTimer: ReturnType<typeof setTimeout> | undefined;
const liftListeners: (() => void)[] = [];

/** What the scene site asks of the entry gate: whether the visitor muted on a previous visit (which button takes
 *  focus), and what to do, inside the press itself, before the screen lifts. */
export interface EntryGate {
  savedMuted: boolean;
  onEnter: (withSound: boolean) => void;
}

let gate: EntryGate | null = null;
let gateShown = false;
/** Removes the gate's window listeners; set while it shows. */
let gateCleanup: (() => void) | null = null;

const screen = () => document.getElementById(SCREEN_ID);

function step() {
  done++;
  const el = screen();
  if (!el) return;
  el.querySelector<HTMLElement>('.loading-screen-fill')?.style.setProperty('transform', `scaleX(${done / total})`);
  el.dataset.done = String(done);
  el.dataset.total = String(total);
}

/** Lets the visitor in: unlocks scrolling and the page at once, then fades the screen out (or removes it outright). */
function lift(fade: boolean) {
  if (lifted) return;
  lifted = true;
  clearTimeout(limitTimer);
  gateCleanup?.();
  gateCleanup = null;
  for (const listener of liftListeners.splice(0)) listener();
  document.documentElement.classList.remove('booting');
  document.getElementById('root')?.removeAttribute('inert');
  const el = screen();
  if (!el) return;
  if (!fade || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    el.remove();
    return;
  }
  el.classList.add('loading-screen-out');
  // fill: the screen stays transparent from the last frame until it is removed.
  const remove = () => el.remove();
  el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: LOADING_SCREEN_FADE_SECONDS * 1000, fill: 'forwards' }).finished.then(
    remove,
    remove,
  );
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Keys that would scroll the page, and how much energy each press gives the Enter button. Space too, but only when
 *  neither gate button has focus: on one, it presses that button. Enter is always left to the focused button. */
const SCROLL_KEYS = new Map<string, number>([
  ['ArrowUp', GATE_ENERGY_PER_KEY.arrow],
  ['ArrowDown', GATE_ENERGY_PER_KEY.arrow],
  ['ArrowLeft', GATE_ENERGY_PER_KEY.arrow],
  ['ArrowRight', GATE_ENERGY_PER_KEY.arrow],
  ['PageUp', GATE_ENERGY_PER_KEY.page],
  ['PageDown', GATE_ENERGY_PER_KEY.page],
  ['Home', GATE_ENERGY_PER_KEY.page],
  ['End', GATE_ENERGY_PER_KEY.page],
  [' ', GATE_ENERGY_PER_KEY.page],
]);
const SVG_NS = 'http://www.w3.org/2000/svg';

/** A small speaker with one sound wave, drawn in the text colour. */
function speakerIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('class', 'loading-gate-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const body = document.createElementNS(SVG_NS, 'path');
  body.setAttribute('d', 'M2 6h2.5L8 3v10L4.5 10H2z');
  body.setAttribute('fill', 'currentColor');
  const wave = document.createElementNS(SVG_NS, 'path');
  wave.setAttribute('d', 'M10.5 5.5a3.5 3.5 0 0 1 0 5M12.5 3.5a6.3 6.3 0 0 1 0 9');
  wave.setAttribute('fill', 'none');
  wave.setAttribute('stroke', 'currentColor');
  wave.setAttribute('stroke-width', '1.3');
  wave.setAttribute('stroke-linecap', 'round');
  svg.append(body, wave);
  return svg;
}

function gateButton(className: string, onPress: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.addEventListener('click', onPress);
  return button;
}

/** A wheel event's vertical scroll in px, whether it counts in px, lines or pages. */
export function wheelPx(deltaY: number, deltaMode: number, pageHeight: number) {
  const unit = deltaMode === 1 ? GATE_WHEEL_LINE_PX : deltaMode === 2 ? pageHeight : 1;
  return Math.abs(deltaY) * unit;
}

/** How the Enter button draws at an energy: its scale (none with reduced motion) and its border opacity, or null at
 *  rest, where it draws as `index.html` has it. */
export function energyStyle(energy: number, reduced: boolean): { transform?: string; borderOpacity: number } | null {
  if (energy <= 0) return null;
  const [rest, full] = GATE_ENERGY_BORDER_OPACITY;
  const borderOpacity = rest + (full - rest) * energy;
  return reduced ? { borderOpacity } : { transform: `scale(${1 + GATE_ENERGY_MAX_SCALE * energy})`, borderOpacity };
}

/** The Enter button's energy under the gate. `add` raises it, up to 1; each frame it decays by its half-life, and
 *  `draw` gets it after every change. Frames are requested only while it is above rest, so none run once it settles
 *  or after `stop`. */
export function gateEnergy(
  draw: (energy: number) => void,
  requestFrame: (callback: (time: number) => void) => number,
  cancelFrame: (handle: number) => void,
  now: () => number,
) {
  let energy = 0;
  // When the energy last decayed, in ms on the frame clock.
  let last = 0;
  let frame: number | undefined;
  const tick = (time: number) => {
    frame = undefined;
    // A frame's time is when the frame started, which can come before the `now()` that woke the loop.
    energy *= 0.5 ** (Math.max(0, time - last) / 1000 / GATE_ENERGY_HALF_LIFE_SECONDS);
    last = Math.max(last, time);
    if (energy <= GATE_ENERGY_REST) energy = 0;
    draw(energy);
    if (energy > 0) frame = requestFrame(tick);
  };
  return {
    add(amount: number) {
      if (!(amount > 0)) return;
      if (frame === undefined) last = now();
      energy = Math.min(1, energy + amount);
      if (energy <= GATE_ENERGY_REST) {
        energy = 0;
        return;
      }
      draw(energy);
      frame ??= requestFrame(tick);
    },
    stop() {
      if (frame !== undefined) cancelFrame(frame);
      frame = undefined;
      energy = 0;
      draw(0);
    },
  };
}

/** Replaces the bar with the entry gate, in the same place, and waits for the visitor's press. Shown once. */
function showGate(entry: EntryGate) {
  if (gateShown || lifted) return;
  gateShown = true;
  const el = screen();
  if (!el) {
    lift(true);
    return;
  }

  const enter = (withSound: boolean) => {
    if (lifted) return;
    // Inside the click handler, so the browser counts this press as the one that allows sound.
    entry.onEnter(withSound);
    lift(true);
  };

  const enterButton = gateButton('loading-gate-enter', () => enter(true));
  const label = document.createElement('span');
  label.className = 'loading-gate-label';
  const subline = document.createElement('span');
  subline.className = 'loading-gate-subline';
  subline.textContent = UI.withSound;
  // The space keeps the accessible name "Enter with sound"; the subline sits on its own line.
  label.append(UI.enter, ' ', subline);
  enterButton.append(speakerIcon(), label);

  const quietButton = gateButton('loading-gate-quiet', () => enter(false));
  quietButton.textContent = UI.enterWithoutSound;

  const gateEl = document.createElement('div');
  gateEl.className = 'loading-gate';
  for (const [name, value] of [
    ['--gate-target', `${GATE_TARGET_MIN_PX}px`],
    ['--gate-enter-width', `${GATE_ENTER_WIDTH_PX}px`],
    ['--gate-gap', `${GATE_GAP_PX}px`],
    ['--gate-enter-font', `${GATE_ENTER_FONT_PX}px`],
    ['--gate-subline-font', `${GATE_ENTER_SUBLINE_FONT_PX}px`],
    ['--gate-quiet-font', `${GATE_QUIET_FONT_PX}px`],
    ['--gate-icon', `${GATE_ICON_PX}px`],
    ['--gate-icon-gap', `${GATE_ICON_GAP_PX}px`],
    ['--gate-enter-padding', `${GATE_ENTER_PADDING_PX[0]}px ${GATE_ENTER_PADDING_PX[1]}px`],
    ['--gate-quiet-padding', `0 ${GATE_QUIET_PADDING_X_PX}px`],
    ['--gate-radius', `${GATE_RADIUS_PX}px`],
    ['--gate-border', `${GATE_BORDER_PX}px`],
    ['--gate-underline-offset', `${GATE_UNDERLINE_OFFSET_PX}px`],
    ['--gate-focus-ring', `${GATE_FOCUS_RING_PX}px`],
    ['--gate-focus-ring-offset', `${GATE_FOCUS_RING_OFFSET_PX}px`],
    ['--gate-side-gutter', `${GATE_SIDE_GUTTER_PX}px`],
  ]) {
    gateEl.style.setProperty(name, value);
  }
  gateEl.append(enterButton, quietButton);

  // In the bar's own slot, positioned out of the flow, so nothing on the screen moves.
  const slot = el.querySelector('.loading-screen-slot') ?? el;
  slot.append(gateEl);
  el.classList.add('loading-screen-gated');
  el.dataset.gate = '';
  const status = el.querySelector('.loading-screen-status');
  if (status) status.textContent = '';
  if (!reducedMotion()) gateEl.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: GATE_FADE_IN_SECONDS * 1000, easing: 'ease-out' });
  (entry.savedMuted ? quietButton : enterButton).focus({ preventScroll: true });

  // Nothing scrolls under the gate: scrolling gives Enter energy instead, in proportion to how far it would have
  // scrolled. The energy is on the button (`data-energy`) so a test can see it. Tab moves between the two buttons only.
  const energy = gateEnergy(
    (value) => {
      enterButton.dataset.energy = String(value);
      const style = energyStyle(value, reducedMotion());
      if (style?.transform) enterButton.style.transform = style.transform;
      else enterButton.style.removeProperty('transform');
      // A variable, not the colour itself, so the hover rule's full border still wins.
      if (style) enterButton.style.setProperty('--gate-energy-border', String(style.borderOpacity));
      else enterButton.style.removeProperty('--gate-energy-border');
    },
    (callback) => requestAnimationFrame(callback),
    (handle) => cancelAnimationFrame(handle),
    () => performance.now(),
  );
  const onWheel = (event: WheelEvent) => {
    if (event.cancelable) event.preventDefault();
    energy.add(wheelPx(event.deltaY, event.deltaMode, window.innerHeight) * GATE_ENERGY_PER_PX);
  };
  const onKey = (event: KeyboardEvent) => {
    const amount = SCROLL_KEYS.get(event.key);
    const onButton = document.activeElement === enterButton || document.activeElement === quietButton;
    if (amount !== undefined && !(event.key === ' ' && onButton)) {
      event.preventDefault();
      energy.add(amount);
      return;
    }
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const active = document.activeElement;
    const next = active === enterButton ? quietButton : active === quietButton ? enterButton : event.shiftKey ? quietButton : enterButton;
    next.focus();
  };
  // A touch drag: touchmove where the browser sends it, and the touch's own pointer moves, since Chromium sends no
  // touchmove for a drag when nothing on the page can scroll. Once the touch is past the slop, each move adds the
  // distance from the last point counted; where both events come for one move, the second finds it already counted.
  let touchLast: { x: number; y: number } | null = null;
  let touchPastSlop = false;
  const touchAttempt = (x: number, y: number) => {
    if (!touchLast) return;
    const distance = Math.hypot(x - touchLast.x, y - touchLast.y);
    if (!touchPastSlop && distance < GATE_TOUCH_SLOP_PX) return;
    touchPastSlop = true;
    touchLast = { x, y };
    energy.add(distance * GATE_ENERGY_PER_PX);
  };
  const onTouchMove = (event: TouchEvent) => {
    if (event.cancelable) event.preventDefault();
    const touch = event.touches[0];
    if (touch) touchAttempt(touch.clientX, touch.clientY);
  };
  const onPointerDown = (event: PointerEvent) => {
    touchLast = event.pointerType === 'touch' && event.isPrimary ? { x: event.clientX, y: event.clientY } : null;
    touchPastSlop = false;
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch' && event.isPrimary) touchAttempt(event.clientX, event.clientY);
  };
  const onPointerEnd = () => {
    touchLast = null;
  };
  const listeners: [string, EventListener][] = [
    ['wheel', onWheel as EventListener],
    ['touchmove', onTouchMove as EventListener],
    ['keydown', onKey as EventListener],
    ['pointerdown', onPointerDown as EventListener],
    ['pointermove', onPointerMove as EventListener],
    ['pointerup', onPointerEnd],
    ['pointercancel', onPointerEnd],
  ];
  const active = { capture: true, passive: false } as const;
  for (const [type, listener] of listeners) window.addEventListener(type, listener, active);
  gateCleanup = () => {
    for (const [type, listener] of listeners) window.removeEventListener(type, listener, active);
    energy.stop();
  };
}

/** Everything the screen waits on is in, or the limit has passed: the scene site shows the gate, anything else lifts. */
function ready() {
  if (gate && !forPage) showGate(gate);
  else lift(true);
}

function liftIfReady() {
  if (!forPage && drawn && chunksLeft === 0) ready();
}

/** The scene's code has loaded. `chunks` is how many page and panel chunks the background fetch will bring, and
 *  `images` how many of the landing's backdrop images decode; `page` is true on a direct page link, where the screen waits for that
 *  page instead. */
export function sceneCodeLoaded(chunks: number, images: number, page: boolean) {
  total = chunks + images + 2;
  chunksLeft = chunks + images;
  forPage = page;
  step();
}

/** The scene has drawn its first frame. Starts the limit. */
export function firstFrameDrawn() {
  if (drawn) return;
  drawn = true;
  step();
  const el = screen();
  if (el) el.dataset.drawn = '';
  if (!lifted) limitTimer = setTimeout(ready, LOADING_SCREEN_LIMIT_SECONDS * 1000);
  liftIfReady();
}

/** One page or panel chunk has arrived, or one backdrop image has decoded. One that failed for good doesn't count; the limit
 *  covers it. */
export function chunkArrived() {
  chunksLeft--;
  step();
  liftIfReady();
}

/** A page's or panel's view has rendered its content, or its failure message. On a direct page link that lifts the
 *  screen. Call it from a layout effect: the lift has to clear `inert` before the view's effects move focus. */
export function contentShown() {
  if (forPage) lift(true);
}

/** The scene site, away from a direct page link: the screen ends on the entry gate instead of lifting by itself. Call
 *  before anything the screen waits on can arrive. */
export function gateEntry(entry: EntryGate) {
  gate = entry;
}

/** Runs `listener` once the screen lifts, or at once if it already has. For loads that mustn't compete with the
 *  steps the screen waits on. */
export function onLifted(listener: () => void) {
  if (lifted) listener();
  else liftListeners.push(listener);
}

/** The HTML site has rendered: the screen goes at once, with no fade. */
export const removeLoadingScreen = () => lift(false);
