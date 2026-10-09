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

describe('AudioContext creation', () => {
  let created = 0;

  // Counts constructions; the context comes up running, so play() can schedule straight away.
  class FakeAudioContext {
    state = 'running';
    currentTime = 0;
    destination = {};
    constructor() {
      created++;
    }
    resume() {
      return Promise.resolve();
    }
    createOscillator() {
      return { type: '', frequency: param(), connect: chain, start() {}, stop() {}, onended: null };
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

  const load = async () => (await import('../../src/sound/sound')).sound;

  beforeEach(() => {
    created = 0;
    vi.resetModules();
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('creates none on import, and play before a click is a silent no-op', async () => {
    const sound = await load();
    expect(sound.muted).toBe(false);
    expect(() => sound.play('in')).not.toThrow();
    expect(created).toBe(0);
  });

  it('creates none from the mute toggle', async () => {
    const sound = await load();
    sound.setMuted(true);
    sound.setMuted(false);
    expect(created).toBe(0);
  });

  it('creates none on a click when the visitor muted before', async () => {
    const sound = await load();
    sound.init(true);
    sound.unlock();
    sound.play('in');
    expect(created).toBe(0);
  });

  it('creates exactly one on the first click when sound is on', async () => {
    const sound = await load();
    sound.unlock();
    sound.unlock();
    expect(created).toBe(1);
    expect(() => sound.play('in')).not.toThrow();
    expect(() => sound.play('out')).not.toThrow();
  });
});
