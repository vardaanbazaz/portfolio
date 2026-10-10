/**
 * Interface sound: the synthesized fly-in and fly-out sweeps, and each zone's looping ambient bed (a bundled file).
 * The only module that touches Web Audio. The AudioContext is created only by `unlock()`, which runs on the
 * visitor's first pointer or key press anywhere on the page (or at `listen()`, for a press that came before it);
 * never at import time or on a load nobody has pressed during, and never while muted.
 * Ambient files are fetched only once that context exists.
 */

import { AMBIENT_FADE_SECONDS, SWEEP_PEAK_GAIN, SWEEP_SECONDS } from '../scene/tuning';

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

/** One looping ambient bed. `level` is what the scene last asked for; the nodes exist once its file has decoded. */
interface Bed {
  level: number;
  loading: boolean;
  gain: GainNode | null;
}
const beds = new Map<string, Bed>();
/** Every bed goes through this, so mute fades them all out together. Created with the context. */
let ambientBus: GainNode | null = null;

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

/** Fetches and decodes a bed's file once, then loops it from silence up to its level. */
function startBed(ctx: AudioContext, url: string, bed: Bed) {
  if (bed.loading || bed.gain || bed.level <= 0 || !ambientBus) return;
  bed.loading = true;
  const bus = ambientBus;
  fetch(url)
    .then((response) => response.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => {
      bed.loading = false;
      if (context !== ctx) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(gain).connect(bus);
      source.start();
      gain.gain.setTargetAtTime(bed.level, ctx.currentTime, AMBIENT_FADE_SECONDS);
      bed.gain = gain;
    })
    // A failed fetch or decode leaves the bed silent; the next level change tries again.
    .catch(() => {
      bed.loading = false;
    });
}

/** Plays the held sweep once the context runs. */
function flush() {
  if (!pending || muted || context?.state !== 'running') return;
  sweep(context, pending.direction, pending.requestedAt);
  pending = null;
}

const noop = () => { };
/** Removes what `listen()` added. */
let unlisten: () => void = noop;

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
      ambientBus = context.createGain();
      ambientBus.connect(context.destination);
    }
    wake(context);
    flush();
    for (const [url, bed] of beds) startBed(context, url, bed);
  },

  /**
   * Runs `unlock()` on every pointer and key press on `target`, and suspends the context while `doc` is hidden.
   * Call once at startup. Creates nothing by itself, unless `pressedBefore`: the visitor pressed before this ran
   * (during the loading screen, before the scene's code arrived). That press counts as the first; the browser still
   * lets the page start sound on it.
   */
  listen(target: EventTarget, doc: VisibilitySource, pressedBefore = false) {
    visibility = doc;
    const unlock = () => sound.unlock();
    for (const type of GESTURE_EVENTS) target.addEventListener(type, unlock, { capture: true, passive: true });
    doc.addEventListener('visibilitychange', onVisibilityChange);
    unlisten = () => {
      for (const type of GESTURE_EVENTS) target.removeEventListener(type, unlock, { capture: true });
      doc.removeEventListener('visibilitychange', onVisibilityChange);
    };
    if (pressedBefore) unlock();
  },

  /** Stops for good: no more presses create or wake the context, and an existing one is closed.
   *  For the switch to the HTML site after a lost WebGL context, which has no sound. */
  dispose() {
    unlisten();
    unlisten = noop;
    pending = null;
    if (context && context.state !== 'closed') void context.close().catch(() => { });
    context = null;
    ambientBus = null;
    beds.clear();
  },

  /** Changes and saves the mute state. Never creates the AudioContext; the next press does. */
  setMuted(next: boolean) {
    muted = next;
    writeMuted(browserStorage(), next);
    if (context && ambientBus) ambientBus.gain.setTargetAtTime(next ? 0 : 1, context.currentTime, AMBIENT_FADE_SECONDS);
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

  /**
   * Sets an ambient bed's level (0 to 1), easing there with time constant `fadeSeconds`. Before the first press it
   * only records the level; the press that creates the context starts the bed. Fetches nothing until then.
   */
  ambient(url: string, level: number, fadeSeconds: number) {
    let bed = beds.get(url);
    if (!bed) {
      bed = { level: 0, loading: false, gain: null };
      beds.set(url, bed);
    }
    if (Math.abs(level - bed.level) < 1e-4) return;
    bed.level = level;
    if (!context) return;
    if (bed.gain) bed.gain.gain.setTargetAtTime(level, context.currentTime, fadeSeconds);
    else startBed(context, url, bed);
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
