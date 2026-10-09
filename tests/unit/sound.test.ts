import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readMuted, writeMuted } from '../../src/sound/sound';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

const throwing = {
  getItem: (): string | null => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('mute persistence', () => {
  it('defaults to sound on when nothing is saved', () => {
    expect(readMuted(memoryStorage())).toBe(false);
  });

  it('defaults to sound on when storage is unavailable or throws', () => {
    expect(readMuted(null)).toBe(false);
    expect(readMuted(throwing)).toBe(false);
  });

  it('round-trips both states', () => {
    const storage = memoryStorage();
    writeMuted(storage, true);
    expect(readMuted(storage)).toBe(true);
    writeMuted(storage, false);
    expect(readMuted(storage)).toBe(false);
  });

  it('does not throw when writing fails', () => {
    expect(() => writeMuted(throwing, true)).not.toThrow();
    expect(() => writeMuted(null, true)).not.toThrow();
  });
});

describe('AudioContext lifecycle', () => {
  let contexts: FakeAudioContext[] = [];

  // Starts suspended, like a context created on a touch pointerdown; tests move it to running with `run()`.
  class FakeAudioContext extends EventTarget {
    state: AudioContextState = 'suspended';
    currentTime = 2;
    destination = {};
    resumes = 0;
    suspends = 0;
    sweeps: number[] = [];
    keepAwake: { offset: number; started: boolean } | null = null;
    constructor() {
      super();
      contexts.push(this);
    }
    run() {
      this.state = 'running';
      this.dispatchEvent(new Event('statechange'));
    }
    resume() {
      this.resumes++;
      return Promise.resolve();
    }
    suspend() {
      this.suspends++;
      return Promise.resolve();
    }
    createConstantSource() {
      const node = { offset: { value: 0 }, connect: chain, started: false, start: () => (node.started = true) };
      this.keepAwake = {
        get offset() {
          return node.offset.value;
        },
        get started() {
          return node.started;
        },
      };
      return node;
    }
    createOscillator() {
      return {
        type: '',
        frequency: param(),
        connect: chain,
        start: (t: number) => this.sweeps.push(t),
        stop() {},
        onended: null,
      };
    }
    createBiquadFilter() {
      return { type: '', frequency: param(), connect: chain };
    }
    createGain() {
      return { gain: param(), connect: chain, disconnect() {} };
    }
  }
  function param() {
    return { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} };
  }
  function chain(next: unknown) {
    return next;
  }

  class FakeDocument extends EventTarget {
    visibilityState: DocumentVisibilityState = 'visible';
    set(state: DocumentVisibilityState) {
      this.visibilityState = state;
      this.dispatchEvent(new Event('visibilitychange'));
    }
  }

  let page: EventTarget;
  let doc: FakeDocument;
  const press = (type = 'pointerdown') => page.dispatchEvent(new Event(type));

  const load = async (savedMuted = false) => {
    const { sound } = await import('../../src/sound/sound');
    sound.init(savedMuted);
    sound.listen(page, doc);
    return sound;
  };

  beforeEach(() => {
    contexts = [];
    page = new EventTarget();
    doc = new FakeDocument();
    vi.resetModules();
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('creates none on import or load, and play before any press is a silent no-op', async () => {
    const sound = await load();
    expect(sound.muted).toBe(false);
    expect(() => sound.play('in')).not.toThrow();
    expect(contexts).toHaveLength(0);
  });

  it('creates exactly one on the first pointerdown anywhere, and resumes it on later presses', async () => {
    await load();
    press('pointerdown');
    expect(contexts).toHaveLength(1);
    press('pointerup');
    press('click');
    expect(contexts).toHaveLength(1);
    expect(contexts[0].resumes).toBe(3);
  });

  it('creates one on the first keydown', async () => {
    await load();
    press('keydown');
    expect(contexts).toHaveLength(1);
  });

  it('creates none on any press when the visitor muted before, or from the mute toggle', async () => {
    const sound = await load(true);
    press('pointerdown');
    press('keydown');
    sound.play('in');
    sound.setMuted(false);
    expect(contexts).toHaveLength(0);
  });

  it('starts an inaudible but non-zero keep-awake signal with the context', async () => {
    await load();
    press();
    const { keepAwake } = contexts[0];
    expect(keepAwake?.started).toBe(true);
    expect(keepAwake?.offset).toBeGreaterThan(3e-5);
    expect(keepAwake?.offset).toBeLessThan(1e-3);
  });

  it('suspends when the tab is hidden and resumes when it is visible again; nothing else suspends', async () => {
    const sound = await load();
    press();
    const ctx = contexts[0];
    ctx.run();
    sound.play('in')();
    sound.play('out')();
    expect(ctx.suspends).toBe(0);
    doc.set('hidden');
    expect(ctx.suspends).toBe(1);
    const resumesBefore = ctx.resumes;
    ctx.state = 'suspended';
    doc.set('visible');
    expect(ctx.resumes).toBe(resumesBefore + 1);
  });

  it('schedules each sweep 50 ms ahead of the context clock', async () => {
    const sound = await load();
    press();
    const ctx = contexts[0];
    ctx.run();
    sound.play('in');
    expect(ctx.sweeps).toEqual([2.05]);
  });

  it('holds a sweep while the context is not running and plays it once it runs', async () => {
    const sound = await load();
    press();
    const ctx = contexts[0];
    sound.play('in');
    expect(ctx.sweeps).toHaveLength(0);
    ctx.run();
    expect(ctx.sweeps).toHaveLength(1);
    ctx.dispatchEvent(new Event('statechange'));
    expect(ctx.sweeps).toHaveLength(1);
  });

  it('holds a sweep asked for before the first press, for the context that press creates', async () => {
    const sound = await load();
    sound.play('out');
    press();
    contexts[0].run();
    expect(contexts[0].sweeps).toHaveLength(1);
  });

  it('drops a held sweep once its flight ends', async () => {
    const sound = await load();
    press();
    const ctx = contexts[0];
    const cancel = sound.play('in');
    cancel();
    ctx.run();
    expect(ctx.sweeps).toHaveLength(0);
  });

  it('a reversal plays only the latest flight\'s sweep', async () => {
    const sound = await load();
    press();
    const ctx = contexts[0];
    const cancelIn = sound.play('in');
    cancelIn();
    sound.play('out');
    cancelIn();
    ctx.run();
    expect(ctx.sweeps).toHaveLength(1);
  });
});
