/**
 * Synthesized interface sound. Web Audio only, no audio files.
 * The only module that touches Web Audio. The AudioContext is created only by `unlock()`, which the app calls
 * inside a marker or box click; never at import time, on load, or from the mute toggle.
 */

/** Fly-in sweep rises; fly-out sweep falls. */
export type Direction = 'in' | 'out';

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem'>;

const STORAGE_KEY = 'muted';
const SWEEP_S = 0.25;
const PEAK_GAIN = 0.03;

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

let context: AudioContext | null = null;
let muted = false;
const listeners = new Set<() => void>();

function sweep(ctx: AudioContext, direction: Direction) {
  const t = ctx.currentTime;
  const [from, to] = direction === 'in' ? [220, 440] : [440, 220];

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + SWEEP_S);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(PEAK_GAIN, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + SWEEP_S);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.onended = () => gain.disconnect();
  osc.start(t);
  osc.stop(t + SWEEP_S + 0.02);
}

export const sound = {
  get muted() {
    return muted;
  },

  /** Sets the starting mute state from the saved preference without writing it back. */
  init(initialMuted: boolean) {
    muted = initialMuted;
  },

  /** Creates or resumes the AudioContext. Call only from a marker or box click. Does nothing while muted. */
  unlock() {
    if (muted) return;
    if (!context) context = new AudioContext();
    if (context.state === 'suspended') void context.resume();
  },

  /** Changes and saves the mute state. Never creates the AudioContext; the next marker click does. */
  setMuted(next: boolean) {
    muted = next;
    writeMuted(browserStorage(), next);
    listeners.forEach((listener) => listener());
  },

  play(direction: Direction) {
    if (muted || !context) return;
    const ctx = context;
    // A context created in the click may still be resuming when the fly-in starts; play once it runs.
    if (ctx.state === 'running') sweep(ctx, direction);
    else if (ctx.state === 'suspended')
      ctx.resume().then(
        () => !muted && sweep(ctx, direction),
        () => {}, // Resume refused outside a gesture; stay silent.
      );
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
