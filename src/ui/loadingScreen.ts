import { LOADING_SCREEN_FADE_SECONDS, LOADING_SCREEN_LIMIT_SECONDS } from '../scene/tuning';

/**
 * The loading screen is plain HTML and CSS in `index.html`, so it shows before any script runs. While it is up, the
 * page can't scroll (the `booting` class on <html>) and everything behind it is inert. This module fills its bar and
 * lifts it; it imports nothing 3D, so the HTML site can use it too.
 *
 * Its progress is real: on the scene site, one step for the scene's code, one for the scene's first frame, one per
 * backdrop poster, and one per page and panel chunk fetched. Backdrop videos and sound never count. It lifts once the
 * scene has drawn and every poster and chunk has arrived, or at the limit in
 * `tuning.ts` after the first frame. On a direct page link it lifts as soon as that page has rendered instead.
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

function liftIfReady() {
  if (!forPage && drawn && chunksLeft === 0) lift(true);
}

/** The scene's code has loaded. `chunks` is how many page and panel chunks the background fetch will bring, and
 *  `posters` how many backdrop posters load; `page` is true on a direct page link, where the screen waits for that
 *  page instead. */
export function sceneCodeLoaded(chunks: number, posters: number, page: boolean) {
  total = chunks + posters + 2;
  chunksLeft = chunks + posters;
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
  if (!lifted) limitTimer = setTimeout(() => lift(true), LOADING_SCREEN_LIMIT_SECONDS * 1000);
  liftIfReady();
}

/** One page or panel chunk, or one backdrop poster, has arrived. One that failed for good doesn't count; the limit
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

/** Runs `listener` once the screen lifts, or at once if it already has. For loads that mustn't compete with the
 *  steps the screen waits on. */
export function onLifted(listener: () => void) {
  if (lifted) listener();
  else liftListeners.push(listener);
}

/** The HTML site has rendered: the screen goes at once, with no fade. */
export const removeLoadingScreen = () => lift(false);
