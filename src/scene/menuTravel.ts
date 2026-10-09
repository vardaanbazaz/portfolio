import { animate } from 'motion/react';
import { scrollProgress, travelSeconds } from './cameraPath';
import { MENU_TRAVEL_EASE } from './tuning';

/** Keys that scroll the page. Pressing one during a travel hands control back to the visitor. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);
const LISTEN = { capture: true, passive: true } as const;

let stopCurrent: (() => void) | null = null;
let snapPending = false;

export const isTravelling = () => stopCurrent !== null;

/** Stops a running travel where it is, without calling its callbacks. Safe to call when none is running. */
export function stopTravel(): void {
  stopCurrent?.();
}

/** True once after a reduced-motion jump: the camera takes the new scroll position at once instead of easing. */
export function takeCameraSnap(): boolean {
  const snap = snapPending;
  snapPending = false;
  return snap;
}

interface TravelCallbacks {
  onArrive: () => void;
  /** The visitor scrolled (wheel, touch or a scroll key) during the travel, which stopped it. */
  onCancel: () => void;
}

/**
 * Glides the window's scroll position to `y`, easing in and out, over a time set by the path distance.
 * Starts from wherever the scroll is, stopping any travel already running.
 * With reduced motion set, jumps there at once and the camera follows without easing.
 */
export function travelTo(y: number, maxScroll: number, { onArrive, onCancel }: TravelCallbacks): void {
  stopTravel();
  const from = window.scrollY;
  const duration = travelSeconds(scrollProgress(from, maxScroll), scrollProgress(y, maxScroll));

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || duration === 0) {
    if (from !== y) snapPending = true;
    window.scrollTo(0, y);
    onArrive();
    return;
  }

  // Wheel, touch and key events, not scroll events: the travel's own scrollTo fires those.
  const cancel = () => {
    stop();
    onCancel();
  };
  const onKey = (e: KeyboardEvent) => {
    if (SCROLL_KEYS.has(e.key)) cancel();
  };
  window.addEventListener('wheel', cancel, LISTEN);
  // touchmove, not touchstart: a plain tap (mute, menu toggle, another menu item) mustn't cancel.
  window.addEventListener('touchmove', cancel, LISTEN);
  window.addEventListener('keydown', onKey, LISTEN);

  const controls = animate(from, y, {
    duration,
    ease: MENU_TRAVEL_EASE,
    onUpdate: (v) => window.scrollTo(0, v),
    onComplete: () => {
      stop();
      onArrive();
    },
  });

  function stop() {
    controls.stop();
    window.removeEventListener('wheel', cancel, LISTEN);
    window.removeEventListener('touchmove', cancel, LISTEN);
    window.removeEventListener('keydown', onKey, LISTEN);
    stopCurrent = null;
  }
  stopCurrent = stop;
}
