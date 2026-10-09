/**
 * Synthesized interface sound. Web Audio only, no audio files.
 * The only module that touches Web Audio. The AudioContext is created only by `unlock()`, which runs on the
 * visitor's first pointer or key press anywhere on the page; never at import time or on load, and never while muted.
 */

import { SWEEP_PEAK_GAIN, SWEEP_SECONDS } from '../scene/tuning';

/** Fly-in sweep rises; fly-out sweep falls. */
export type Direction = 'in' | 'out';

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

const STORAGE_KEY = 'muted';
/** Each sweep starts this far ahead of the context's clock, so its attack is never scheduled in the past. */
const LEAD_S = 0.05;
/** Offset of the constant keep-awake signal: far below hearing, but above 16-bit silence (about 3e-5). */
const KEEP_AWAKE_LEVEL = 1e-4;

/**
 * Every press runs `unlock()`. Touch `pointerdown` creates the context but does not count as a user gesture for
 * audio; `pointerup` and `click` do, so they resume it.
 */
const GESTURE_EVENTS = ['pointerdown', 'pointerup', 'click', 'keydown'] as const;

/** Saved mute preference. Sound is on unless the visitor muted before; a missing or throwing storage counts as on. */
export function readMuted(storage: ReadableStorage | null): boolean {
  try {
    return storage?.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function writeMuted(storage: WritableStorage | null, muted: boolean): void {
  try {
    storage?.setItem(STORAGE_KEY, String(muted));
  } catch {
    // Storage is blocked; the in-memory state still applies for this visit.
  }
}

/** localStorage, or null where the accessor itself throws (blocked site data, some private windows). */
export function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

type VisibilitySource = Pick<Document, 'visibilityState'> & EventTarget;

let context: AudioContext | null = null;
let muted = false;
let visibility: VisibilitySource | null = null;
/** The latest sweep asked for while the context wasn't running. Its flight's cancel clears it. */
let pending: { direction: Direction; requestedAt: number } | null = null;
const listeners = new Set<() => void>();

const isVisible = () => !visibility || visibility.visibilityState === 'visible';

function wake(ctx: AudioContext) {
  // Refused outside a gesture (common on phones); the next press tries again.
  if (ctx.state !== 'running') ctx.resume().catch(() => { });
}

/** Inaudible constant signal so the output device never goes idle between sweeps. Runs for the life of the context. */
function keepAwake(ctx: AudioContext) {
  const source = ctx.createConstantSource();
  source.offset.value = KEEP_AWAKE_LEVEL;
  source.connect(ctx.destination);
  source.start();
}

function onVisibilityChange() {
  if (!context) return;
  if (isVisible()) wake(context);
  else void context.suspend().catch(() => { });
}

function sweep(ctx: AudioContext, direction: Direction, requestedAt: number) {
  const t = ctx.currentTime + LEAD_S;
  if (import.meta.env.DEV) {
    console.log(
      `[sound] ${direction} state=${ctx.state} now=${ctx.currentTime.toFixed(3)}s start=${t.toFixed(3)}s ` +
      `waited=${Math.round(performance.now() - requestedAt)}ms`,
    );
  }
  const [from, to] = direction === 'in' ? [440, 880] : [880, 440];

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + SWEEP_SECONDS);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 3000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(SWEEP_PEAK_GAIN, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + SWEEP_SECONDS);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.onended = () => gain.disconnect();
  osc.start(t);
  osc.stop(t + SWEEP_SECONDS + 0.02);
}

/** Plays the held sweep once the context runs. */
function flush() {
  if (!pending || muted || context?.state !== 'running') return;
  sweep(context, pending.direction, pending.requestedAt);
  pending = null;
}

const noop = () => { };

export const sound = {
  get muted() {
    return muted;
  },

  /** Sets the starting mute state from the saved preference without writing it back. */
  init(initialMuted: boolean) {
    muted = initialMuted;
  },

  /**
   * Creates the AudioContext, or resumes it. Does nothing while muted or while the tab is hidden.
   * Runs on every press via `listen()`; safe to call any number of times.
   */
  unlock() {
    if (muted || !isVisible()) return;
    if (!context || context.state === 'closed') {
      context = new AudioContext();
      context.addEventListener('statechange', flush);
      keepAwake(context);
    }
    wake(context);
    flush();
  },

  /**
   * Runs `unlock()` on every pointer and key press on `target`, and suspends the context while `doc` is hidden.
   * Call once at startup. Creates nothing by itself.
   */
  listen(target: EventTarget, doc: VisibilitySource) {
    visibility = doc;
    const unlock = () => sound.unlock();
    for (const type of GESTURE_EVENTS) target.addEventListener(type, unlock, { capture: true, passive: true });
    doc.addEventListener('visibilitychange', onVisibilityChange);
  },

  /** Changes and saves the mute state. Never creates the AudioContext; the next press does. */
  setMuted(next: boolean) {
    muted = next;
    writeMuted(browserStorage(), next);
    listeners.forEach((listener) => listener());
  },

  /**
   * Plays the sweep now if the context is running, or holds it until the context runs.
   * Returns a cancel function; call it when the flight ends so a held sweep never plays late.
   */
  play(direction: Direction): () => void {
    if (muted) return noop;
    const request = { direction, requestedAt: performance.now() };
    pending = request;
    if (import.meta.env.DEV && context?.state !== 'running') {
      console.log(`[sound] ${direction} held, state=${context?.state ?? 'none'}`);
    }
    flush();
    return () => {
      if (pending === request) pending = null;
    };
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
