import {
  GATE_BORDER_PX,
  GATE_ENTER_FONT_PX,
  GATE_ENTER_PADDING_PX,
  GATE_ENTER_SUBLINE_FONT_PX,
  GATE_ENTER_WIDTH_PX,
  GATE_FADE_IN_SECONDS,
  GATE_FOCUS_RING_OFFSET_PX,
  GATE_FOCUS_RING_PX,
  GATE_GAP_PX,
  GATE_GESTURE_GAP_SECONDS,
  GATE_ICON_GAP_PX,
  GATE_ICON_PX,
  GATE_PULSE_SCALE,
  GATE_PULSE_SECONDS,
  GATE_QUIET_FONT_PX,
  GATE_QUIET_PADDING_X_PX,
  GATE_RADIUS_PX,
  GATE_SIDE_GUTTER_PX,
  GATE_TARGET_MIN_PX,
  GATE_TOUCH_SLOP_PX,
  GATE_UNDERLINE_OFFSET_PX,
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
 * backdrop image decoded, and one per page and panel chunk fetched. Sound never counts. It lifts once the scene has
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

/** Keys that would scroll the page. Space and Enter are left to the focused button. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End']);
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

/** Tells scroll gestures apart. Takes each wheel, touch-drag or scroll-key event's time, in ms, and whether it only
 *  continues one already counted (a held key's repeats, the later moves of a touch already counted), and returns
 *  true when it starts a new gesture: the first after a quiet gap of `gapSeconds`. */
export function scrollGestures(gapSeconds: number) {
  let last = -Infinity;
  return (time: number, continuing: boolean) => {
    const starts = !continuing && time - last >= gapSeconds * 1000;
    last = time;
    return starts;
  };
}

/** One short pulse of the Enter button. Counted on the button (`data-pulses`) so a test can see it. One still running
 *  is replaced by the new one, which starts from wherever the old one had got to, so nothing stacks or jumps. */
let pulseAnimation: Animation | undefined;
function pulse(button: HTMLElement) {
  button.dataset.pulses = String(Number(button.dataset.pulses ?? 0) + 1);
  const property = reducedMotion() ? 'borderColor' : 'transform';
  const keyframes: Keyframe[] =
    property === 'borderColor'
      ? [{ borderColor: 'rgb(206 202 175 / 0.6)' }, { borderColor: 'rgb(206 202 175 / 1)' }, { borderColor: 'rgb(206 202 175 / 0.6)' }]
      : [{ transform: 'scale(1)' }, { transform: `scale(${GATE_PULSE_SCALE})` }, { transform: 'scale(1)' }];
  if (pulseAnimation?.playState === 'running') {
    keyframes[0] = { [property]: getComputedStyle(button)[property] };
    pulseAnimation.cancel();
  }
  pulseAnimation = button.animate?.(keyframes, { id: 'gate-pulse', duration: GATE_PULSE_SECONDS * 1000, easing: 'ease-in-out' });
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

  // Nothing scrolls under the gate: each scroll gesture pulses Enter once instead. Tab moves between the two buttons
  // only. Gaps are measured between the events' own times, so a busy frame between two of them doesn't split one.
  const startsGesture = scrollGestures(GATE_GESTURE_GAP_SECONDS);
  const scrollAttempt = (event: Event, continuing: boolean) => {
    if (startsGesture(event.timeStamp, continuing)) pulse(enterButton);
  };
  const onWheel = (event: Event) => {
    if (event.cancelable) event.preventDefault();
    scrollAttempt(event, false);
  };
  const onKey = (event: KeyboardEvent) => {
    if (SCROLL_KEYS.has(event.key)) {
      event.preventDefault();
      scrollAttempt(event, event.repeat);
      return;
    }
    if (event.key !== 'Tab') return;
    event.preventDefault();
    const active = document.activeElement;
    const next = active === enterButton ? quietButton : active === quietButton ? enterButton : event.shiftKey ? quietButton : enterButton;
    next.focus();
  };
  // A touch drag: touchmove where the browser sends it, and the touch's own pointer moves, since Chromium sends no
  // touchmove for a drag when nothing on the page can scroll. Every move counts once the touch is past the slop, and
  // after its first counted move the rest continue its gesture.
  let touchFrom: { x: number; y: number } | null = null;
  let touchPastSlop = false;
  let touchCounted = false;
  const touchAttempt = (event: Event) => {
    scrollAttempt(event, touchCounted);
    touchCounted = true;
  };
  const onTouchMove = (event: Event) => {
    if (event.cancelable) event.preventDefault();
    touchAttempt(event);
  };
  const onPointerDown = (event: PointerEvent) => {
    touchFrom = event.pointerType === 'touch' ? { x: event.clientX, y: event.clientY } : null;
    touchPastSlop = false;
    touchCounted = false;
  };
  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerType !== 'touch' || !touchFrom) return;
    if (!touchPastSlop && Math.hypot(event.clientX - touchFrom.x, event.clientY - touchFrom.y) < GATE_TOUCH_SLOP_PX) return;
    touchPastSlop = true;
    touchAttempt(event);
  };
  const onPointerEnd = () => {
    touchFrom = null;
  };
  const listeners: [string, EventListener][] = [
    ['wheel', onWheel],
    ['touchmove', onTouchMove],
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
 *  `images` how many backdrop images decode; `page` is true on a direct page link, where the screen waits for that
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
