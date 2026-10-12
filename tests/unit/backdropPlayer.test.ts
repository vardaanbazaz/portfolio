import { describe, expect, it, vi } from 'vitest';
import { ZONE_T } from '../../src/environment/zones';

const fakeLayer = () => ({ style: { visibility: '', opacity: '' }, dataset: {} as Record<string, string> });

/** A stand-in for an image element: records transforms written to it, and decodes when the test says. */
function fakeImage() {
  let decoded: () => void = () => undefined;
  const image = {
    style: { transform: '' },
    decode: vi.fn(() => new Promise<void>((resolve) => (decoded = resolve))),
    writes: 0,
  };
  let transform = '';
  Object.defineProperty(image.style, 'transform', {
    get: () => transform,
    set: (value: string) => {
      transform = value;
      image.writes++;
    },
  });
  return { image, decode: () => decoded() };
}

/** A fresh player (its state is module-wide), released as after the loading screen, with the landing registered. */
async function player() {
  vi.resetModules();
  const module = await import('../../src/environment/backdropPlayer');
  const layer = fakeLayer();
  const base = fakeImage();
  const ground = fakeImage();
  module.registerBackdrop('landing', layer as unknown as HTMLElement, [base.image, ground.image] as unknown as HTMLImageElement[]);
  module.releaseBackdrops();
  return { ...module, layer, base, ground };
}

/** Lets settled promises run their handlers. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A document whose visibility the test sets. */
function fakeDocument() {
  const listeners: (() => void)[] = [];
  const doc = {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (_: string, listener: () => void) => listeners.push(listener),
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
  };
  return { doc, set: (state: DocumentVisibilityState) => ((doc.visibilityState = state), listeners.forEach((l) => l())) };
}

describe('backdropPlayer keeps the landing layer shown once the camera has settled', () => {
  it('shows it at the landing', async () => {
    const { followPath, layer } = await player();
    followPath(0);
    expect(layer.style).toEqual({ visibility: 'visible', opacity: '1.000' });
  });

  it('puts back styles the layer lost, though the path has not moved', async () => {
    const { followPath, layer } = await player();
    followPath(0);
    layer.style.visibility = '';
    layer.style.opacity = '';
    followPath(0);
    expect(layer.style).toEqual({ visibility: 'visible', opacity: '1.000' });
  });

  it('shows it again when something else hid it or faded it out', async () => {
    const { followPath, layer } = await player();
    followPath(0);
    layer.style.visibility = 'hidden';
    followPath(0);
    expect(layer.style.visibility).toBe('visible');
    layer.style.opacity = '0';
    followPath(0);
    expect(layer.style.opacity).toBe('1.000');
  });

  it('leaves an opacity the browser wrote back in its own form alone', async () => {
    const { followPath, layer } = await player();
    followPath(0);
    // As a browser reads back "1.000".
    layer.style.opacity = '1';
    followPath(0);
    expect(layer.style.opacity).toBe('1');
  });
});

describe('backdropPlayer motion', () => {
  it('runs at the landing and moves the images there', async () => {
    const { followPath, layer, ground } = await player();
    followPath(ZONE_T.about / 4, 1 / 60);
    expect(layer.dataset.motion).toBe('running');
    expect(ground.image.style.transform).toMatch(/^translate3d\(.+px, .+px, 0\) scale\(.+\)$/);
  });

  it('stops at weight 0, and writes nothing to the images while stopped', async () => {
    const { followPath, layer, base, ground, backdropProbe } = await player();
    followPath(0, 1 / 60);
    followPath(ZONE_T.about, 1 / 60);
    expect(layer.dataset.motion).toBe('stopped');
    expect(backdropProbe('landing')?.running).toBe(false);
    const writes = [base.image.writes, ground.image.writes];
    for (let i = 0; i < 30; i++) followPath(ZONE_T.about + i * 1e-4, 1 / 60);
    expect([base.image.writes, ground.image.writes]).toEqual(writes);
    // And starts again with the landing's weight.
    followPath(0, 1 / 60);
    expect(layer.dataset.motion).toBe('running');
  });

  it('stops under an open page and starts again once it closes', async () => {
    const { followPath, setPageOpen, layer } = await player();
    followPath(0, 1 / 60);
    setPageOpen(true);
    expect(layer.dataset.motion).toBe('stopped');
    setPageOpen(false);
    expect(layer.dataset.motion).toBe('running');
  });

  it('stops while the tab is hidden', async () => {
    const { followPath, listenVisibility, layer } = await player();
    const { doc, set } = fakeDocument();
    listenVisibility(doc as unknown as Document);
    followPath(0, 1 / 60);
    set('hidden');
    expect(layer.dataset.motion).toBe('stopped');
    set('visible');
    expect(layer.dataset.motion).toBe('running');
  });

  it('marks the effects for their fade-in only once the loading screen has lifted', async () => {
    vi.resetModules();
    const module = await import('../../src/environment/backdropPlayer');
    const layer = fakeLayer();
    module.registerBackdrop('landing', layer as unknown as HTMLElement, []);
    module.followPath(0, 1 / 60);
    expect(layer.dataset.released).toBeUndefined();
    module.releaseBackdrops();
    expect(layer.dataset.released).toBe('');
  });
});

/** A window whose reduced-motion setting the test sets, with a 1366x768 view and a fine, hovering pointer. */
function fakeWindow() {
  let reduce = false;
  const changes: (() => void)[] = [];
  const win = {
    innerWidth: 1366,
    innerHeight: 768,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => true,
    matchMedia: (query: string) => ({
      get matches() {
        return query.includes('reduced-motion') ? reduce : true;
      },
      addEventListener: (_: string, listener: () => void) => {
        if (query.includes('reduced-motion')) changes.push(listener);
      },
    }),
  };
  return { win, setReduce: (on: boolean) => ((reduce = on), changes.forEach((l) => l())) };
}

describe('backdropPlayer with reduced motion', () => {
  const AT_REST = /^translate3d\(0\.00px, 0\.00px, 0\) scale\(1\.0400\)$/;

  it('puts the layers at rest when turned on while the motion was stopped away from the landing', async () => {
    const { followPath, listenInput, layer, ground } = await player();
    const { win, setReduce } = fakeWindow();
    listenInput(win as unknown as Window);
    followPath(0, 1 / 60);
    // Pushed away as the weight falls, then stopped at weight 0.
    for (let i = 1; i <= 20; i++) followPath((ZONE_T.about * i) / 20, 1 / 60);
    expect(layer.dataset.motion).toBe('stopped');
    expect(ground.image.style.transform).not.toMatch(AT_REST);
    setReduce(true);
    expect(ground.image.style.transform).toMatch(AT_REST);
    // Home again: still at rest, and still stopped.
    followPath(0, 1 / 60);
    expect(layer.dataset.motion).toBe('stopped');
    expect(ground.image.style.transform).toMatch(AT_REST);
  });
});

describe('backdropPlayer image decoding', () => {
  it('counts each registered image once it has decoded', async () => {
    const { backdropProbe, base, ground } = await player();
    expect(backdropProbe('landing')).toMatchObject({ decoded: 0, total: 2 });
    base.decode();
    await flush();
    expect(backdropProbe('landing')?.decoded).toBe(1);
    ground.decode();
    await flush();
    expect(backdropProbe('landing')?.decoded).toBe(2);
  });

  it('gives the loading screen one step per backdrop image, once each has decoded', async () => {
    vi.resetModules();
    const decodes: (() => void)[] = [];
    const sources: string[] = [];
    vi.stubGlobal(
      'Image',
      class {
        set src(value: string) {
          sources.push(value);
        }
        decode() {
          return new Promise<void>((resolve) => decodes.push(resolve));
        }
      },
    );
    const { preloadImages, BACKDROP_IMAGE_COUNT } = await import('../../src/environment/backdropPlayer');
    const onDecoded = vi.fn();
    preloadImages(onDecoded);
    expect(BACKDROP_IMAGE_COUNT).toBe(2);
    expect(sources).toHaveLength(2);
    expect(sources.every((src) => src.endsWith('.webp'))).toBe(true);
    expect(onDecoded).not.toHaveBeenCalled();
    decodes[0]();
    await flush();
    expect(onDecoded).toHaveBeenCalledTimes(1);
    decodes[1]();
    await flush();
    expect(onDecoded).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});
