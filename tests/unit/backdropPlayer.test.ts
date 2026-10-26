import { describe, expect, it, vi } from 'vitest';
import { ZONE_T } from '../../src/environment/zones';
import { BACKDROP_READY_FADE_SECONDS, BLOOM_DRAWN_PX, BLOOM_PEAK, BLOOM_RADIUS, RAIN_BED_GAIN } from '../../src/scene/tuning';

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

  it("gives the loading screen one step per image of the landing's, once each has decoded, and waits for no other world's", async () => {
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
    // The landing's two layers only: the grove and its stone's masks load once the visitor is in.
    expect(BACKDROP_IMAGE_COUNT).toBe(2);
    expect(sources).toHaveLength(2);
    expect(sources.every((src) => src.endsWith('.webp') && src.includes('landing'))).toBe(true);
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

describe('backdropPlayer and the About grove', () => {
  const fakeBox = () => ({ style: {} as Record<string, string>, dataset: {} as Record<string, string> });

  /** A fresh player with both worlds registered, the stone's elements too, and the bloom; the grove's images not yet
   *  loaded unless `loaded`. */
  async function grovePlayer({ loaded = true } = {}) {
    const module = await player();
    const grove = fakeLayer();
    const base = fakeImage();
    module.registerBackdrop('about', grove as unknown as HTMLElement, [base.image] as unknown as HTMLImageElement[]);
    const plane = fakeBox();
    const box = fakeBox();
    module.registerBackdropPlane('about', plane as unknown as HTMLElement, null);
    module.registerBackdropObject('about', 0, box as unknown as HTMLElement);
    const bloom = fakeBox();
    module.registerBloom(bloom as unknown as HTMLElement);
    const motion = { matches: false, addEventListener: () => undefined };
    module.listenInput({ innerWidth: 1366, innerHeight: 768, addEventListener: () => undefined, matchMedia: () => motion } as unknown as Window);
    /** Loads the grove's images and lets them fade in, over frames at About. */
    const load = async () => {
      void module.loadWorlds();
      base.decode();
      await flush();
      for (let i = 0; i < Math.ceil(BACKDROP_READY_FADE_SECONDS / 0.05) + 2; i++) module.followPath(ZONE_T.about, 0.05);
    };
    if (loaded) await load();
    return { ...module, grove, base, plane, box, bloom, load };
  }

  it("runs the grove's effects at About and stops them at weight 0, at the landing and at Projects", async () => {
    const { followPath, grove } = await grovePlayer();
    followPath(ZONE_T.about);
    expect(grove.dataset.motion).toBe('running');
    followPath(0);
    expect(grove.dataset.motion).toBe('stopped');
    expect(grove.style.visibility).toBe('hidden');
    followPath(ZONE_T.projects);
    expect(grove.dataset.motion).toBe('stopped');
  });

  it('stops them under an open page, in a hidden tab and with reduced motion', async () => {
    const { followPath, grove, setPageOpen, listenVisibility, listenInput } = await grovePlayer();
    followPath(ZONE_T.about);
    setPageOpen(true);
    expect(grove.dataset.motion).toBe('stopped');
    setPageOpen(false);
    expect(grove.dataset.motion).toBe('running');
    const { doc, set } = fakeDocument();
    listenVisibility(doc as unknown as Document);
    set('hidden');
    expect(grove.dataset.motion).toBe('stopped');
    set('visible');
    expect(grove.dataset.motion).toBe('running');
    const reduce = { matches: true, addEventListener: () => undefined };
    const win = { innerWidth: 1366, innerHeight: 768, addEventListener: () => undefined, matchMedia: () => reduce };
    listenInput(win as unknown as Window);
    expect(grove.dataset.motion).toBe('stopped');
  });

  it('marks effects off below 0.05 of weight, so they are not drawn at all, and on above it', async () => {
    const { followPath, grove, layer } = await grovePlayer();
    followPath(0);
    expect(grove.dataset.effects).toBe('off');
    expect(layer.dataset.effects).toBe('on');
    followPath(ZONE_T.about);
    expect(grove.dataset.effects).toBe('on');
    expect(layer.dataset.effects).toBe('off');
  });

  it('raises the bloom to its peak halfway to About, moving and scaling it only, and hides it at both ends', async () => {
    const { followPath, bloom } = await grovePlayer();
    followPath(ZONE_T.about / 2);
    expect(bloom.style.visibility).toBe('visible');
    expect(Number(bloom.style.opacity)).toBeCloseTo(BLOOM_PEAK, 3);
    const scale = Number(/scale\(([\d.]+)\)/.exec(bloom.style.transform)![1]);
    expect((scale * BLOOM_DRAWN_PX) / 2).toBeCloseTo(BLOOM_RADIUS.mid * 1366, 0);
    followPath(ZONE_T.about);
    expect(bloom.style.visibility).toBe('hidden');
    followPath(0);
    expect(bloom.style.visibility).toBe('hidden');
  });

  it('holds both worlds still at rest during the crossing, their effects paused, and lets them go after', async () => {
    const { followPath, grove, layer, base, ground } = await grovePlayer();
    followPath(ZONE_T.about * 0.3, 0.016);
    expect(layer.dataset.motion).toBe('stopped');
    expect(grove.dataset.motion).toBe('stopped');
    expect(layer.dataset.crossing).toBe('');
    const writes = base.image.writes + ground.image.writes;
    for (const u of [0.35, 0.4, 0.5, 0.6]) followPath(ZONE_T.about * u, 0.016);
    expect(base.image.writes + ground.image.writes).toBe(writes);
    followPath(ZONE_T.about, 0.016);
    expect(grove.dataset.motion).toBe('running');
    expect(grove.dataset.crossing).toBeUndefined();
  });

  it('shows one picture or the other between the landing and About, never the dome', async () => {
    const { followPath, layer, grove } = await grovePlayer();
    followPath(ZONE_T.about * 0.3);
    expect([layer.style.visibility, grove.style.visibility]).toEqual(['visible', 'hidden']);
    followPath(ZONE_T.about * 0.7);
    expect(grove.style).toEqual({ visibility: 'visible', opacity: '1.000' });
  });

  it("leaves the grove out until its images have decoded, then fades it in, after the visitor is in", async () => {
    const { followPath, grove, base, load, backdropProbe, backdropObjectView } = await grovePlayer({ loaded: false });
    expect(base.image.decode).not.toHaveBeenCalled();
    followPath(ZONE_T.about, 0.05);
    expect(grove.style.visibility).toBe('hidden');
    expect(backdropProbe('about')).toMatchObject({ load: 'waiting', ready: 0 });
    expect(backdropObjectView('about')).toBeNull();
    await load();
    expect(backdropProbe('about')).toMatchObject({ load: 'decoded', ready: 1 });
    expect(grove.style).toEqual({ visibility: 'visible', opacity: '1.000' });
    expect(backdropObjectView('about')!.shown).toBe(true);
  });

  it('fades the grove in over BACKDROP_READY_FADE_SECONDS once decoded', async () => {
    const { followPath, base, loadWorlds, backdropProbe } = await grovePlayer({ loaded: false });
    void loadWorlds();
    base.decode();
    await flush();
    followPath(ZONE_T.about, 0.05);
    const ready = backdropProbe('about')!.ready;
    expect(ready).toBeCloseTo(0.05 / BACKDROP_READY_FADE_SECONDS, 9);
  });

  it('says where the stone shows and where its top is, and that it shows only while the grove does', async () => {
    const { followPath, backdropObjectView } = await grovePlayer();
    followPath(ZONE_T.about);
    const view = backdropObjectView('about')!;
    expect(view.shown).toBe(true);
    expect(view.box.width).toBeGreaterThan(0);
    expect(view.top[1]).toBeCloseTo(view.box.top, 9);
    expect(view.top[0]).toBeGreaterThan(view.box.left);
    expect(view.top[0]).toBeLessThan(view.box.left + view.box.width);
    followPath(0);
    expect(backdropObjectView('about')!.shown).toBe(false);
    expect(backdropObjectView('contact')).toBeNull();
  });

  it("poses the stone's light as its layer, and places its box at rest", async () => {
    const { followPath, plane, box } = await grovePlayer();
    followPath(ZONE_T.about, 0.016);
    expect(plane.style.transform).toMatch(/^translate3d\(.+\) scale\(1\.0200\)$/);
    expect(parseFloat(box.style.height)).toBeGreaterThan(0);
  });

  it('marks the stone while its marker is hovered or focused, and clears it after', async () => {
    const { setBackdropHover, box } = await grovePlayer();
    setBackdropHover('about');
    expect(box.dataset.hover).toBe('');
    setBackdropHover(null);
    expect(box.dataset.hover).toBeUndefined();
  });
});

describe('backdropPlayer and the night city', () => {
  const fakeBox = () => ({ style: {} as Record<string, string>, dataset: {} as Record<string, string> });

  /** A fresh player with all three worlds registered and loaded, the city's plane and the veil too, in a view of
   *  `width` by `height`. */
  async function cityPlayer({ width = 1366, height = 768, reduced = false } = {}) {
    const module = await player();
    const grove = fakeLayer();
    const groveBase = fakeImage();
    module.registerBackdrop('about', grove as unknown as HTMLElement, [groveBase.image] as unknown as HTMLImageElement[]);
    const city = { ...fakeLayer(), clientWidth: width, clientHeight: height };
    const cityBase = fakeImage();
    module.registerBackdrop('projects', city as unknown as HTMLElement, [cityBase.image] as unknown as HTMLImageElement[]);
    const plane = fakeBox();
    const sign = { ...fakeBox(), dataset: { marker: 'kanbanlight' } as Record<string, string> };
    const art = { ...fakeBox(), querySelectorAll: () => [sign] };
    module.registerBackdropPlane('projects', plane as unknown as HTMLElement, art as unknown as HTMLElement);
    const veil = fakeBox();
    module.registerVeil(veil as unknown as HTMLElement);
    const warm = fakeBox();
    const magenta = fakeBox();
    module.registerNightfall('warm', warm as unknown as HTMLElement);
    module.registerNightfall('magenta', magenta as unknown as HTMLElement);
    const rain = fakeBox();
    const canvas = fakeCanvas();
    module.registerRain('projects', rain as unknown as HTMLElement, canvas as unknown as HTMLCanvasElement);
    const lights = fakeBox();
    module.registerLights('projects', lights as unknown as HTMLImageElement);
    const motion = { matches: reduced, addEventListener: () => undefined };
    module.listenInput({ innerWidth: width, innerHeight: height, addEventListener: () => undefined, matchMedia: () => motion } as unknown as Window);
    void module.loadWorlds();
    groveBase.decode();
    await flush();
    cityBase.decode();
    await flush();
    for (let i = 0; i < Math.ceil(BACKDROP_READY_FADE_SECONDS / 0.05) + 2; i++) module.followPath(ZONE_T.projects, 0.05);
    return { ...module, city, cityBase, plane, sign, veil, warm, magenta, rain, canvas, lights };
  }

  /** A canvas whose context counts its fills and clears. */
  function fakeCanvas() {
    const g = {
      fills: 0,
      clears: 0,
      globalAlpha: 1,
      fillStyle: '',
      setTransform() {},
      beginPath() {},
      moveTo() {},
      lineTo() {},
      closePath() {},
      clearRect() {
        g.clears++;
      },
      fill() {
        g.fills++;
      },
    };
    return { width: 0, height: 0, g, getContext: () => g };
  }

  it("runs the city's life at Projects, and stops it at weight 0, at About and at Experience", async () => {
    const { followPath, city } = await cityPlayer();
    followPath(ZONE_T.projects);
    expect(city.dataset.motion).toBe('running');
    expect(city.dataset.effects).toBe('on');
    followPath(ZONE_T.about);
    expect(city.dataset.motion).toBe('stopped');
    expect(city.dataset.effects).toBe('off');
    followPath(ZONE_T.experience);
    expect(city.dataset.motion).toBe('stopped');
    expect(city.style.visibility).toBe('hidden');
  });

  it('stops it under an open page, in a hidden tab and with reduced motion', async () => {
    const { followPath, city, setPageOpen, listenVisibility, listenInput } = await cityPlayer();
    followPath(ZONE_T.projects);
    setPageOpen(true);
    expect(city.dataset.motion).toBe('stopped');
    setPageOpen(false);
    expect(city.dataset.motion).toBe('running');
    const { doc, set } = fakeDocument();
    listenVisibility(doc as unknown as Document);
    set('hidden');
    expect(city.dataset.motion).toBe('stopped');
    set('visible');
    const reduce = { matches: true, addEventListener: () => undefined };
    listenInput({ innerWidth: 1366, innerHeight: 768, addEventListener: () => undefined, matchMedia: () => reduce } as unknown as Window);
    expect(city.dataset.motion).toBe('stopped');
  });

  it('holds the city still under the veil, then lets it go once the veil has gone', async () => {
    const { followPath, city, veil } = await cityPlayer();
    const at = (u: number) => ZONE_T.about + (ZONE_T.projects - ZONE_T.about) * u;
    followPath(at(0.5));
    expect(city.dataset.crossing).toBe('');
    expect(city.dataset.motion).toBe('stopped');
    expect(Number(veil.style.opacity)).toBeGreaterThan(0.9);
    expect(veil.style.visibility).toBe('visible');
    expect(city.dataset.crossed).toBe('');
    followPath(at(0.9));
    expect(city.dataset.crossing).toBeUndefined();
    expect(city.dataset.motion).toBe('running');
    expect(veil.style.visibility).toBe('hidden');
    // Its rain stays off until the crossing is over.
    expect(city.dataset.crossed).toBe('');
    followPath(ZONE_T.projects);
    expect(city.dataset.crossed).toBeUndefined();
    expect(veil.style.visibility).toBe('hidden');
    followPath(ZONE_T.about);
    expect(veil.style.visibility).toBe('hidden');
  });

  it('pans its picture and its plane together on a phone, and not at all on a wide screen', async () => {
    const phone = await cityPlayer({ width: 390, height: 844 });
    const x = (transform: string) => Number(/translate3d\((-?[\d.]+)px/.exec(transform)![1]);
    phone.followPath(0.35);
    const first = [x(phone.cityBase.image.style.transform), x(phone.plane.style.transform)];
    phone.followPath(0.43);
    const last = [x(phone.cityBase.image.style.transform), x(phone.plane.style.transform)];
    expect(first[0]).toBeGreaterThan(last[0] + 300);
    expect(first[1]).toBeCloseTo(first[0], 1);
    expect(last[1]).toBeCloseTo(last[0], 1);
    const wide = await cityPlayer();
    wide.followPath(0.35);
    const a = x(wide.cityBase.image.style.transform);
    wide.followPath(0.43);
    expect(x(wide.cityBase.image.style.transform)).toBeCloseTo(a, 6);
  });

  it("marks a building's sign while its marker is hovered or focused, and clears it after", async () => {
    const { setBackdropHover, sign } = await cityPlayer();
    setBackdropHover('kanbanlight');
    expect(sign.dataset.hover).toBe('');
    setBackdropHover('datavista');
    expect(sign.dataset.hover).toBeUndefined();
  });

  it('plays the rain bed at its own level, following the weight, and into the city only once the rain begins', async () => {
    const { followPath } = await cityPlayer();
    const { BACKDROPS } = await import('../../src/environment/backdrops');
    const bed = BACKDROPS.find((b) => b.zone === 'projects')!.ambient!;
    // The sound module the player imported, after the reset.
    const { sound } = await import('../../src/sound/sound');
    const levels: [string, number][] = [];
    const ambient = vi.spyOn(sound, 'ambient').mockImplementation((url, level) => void levels.push([url, level]));
    const at = (u: number) => ZONE_T.about + (ZONE_T.projects - ZONE_T.about) * u;
    const rain = () => levels.filter(([url]) => url === bed).map(([, level]) => level);
    followPath(ZONE_T.about);
    followPath(at(0.5));
    // Under the veil, before the rain: silent, though the city has half its weight.
    expect(rain().at(-1)).toBe(0);
    followPath(at(0.7));
    expect(rain().at(-1)!).toBeGreaterThan(0);
    followPath(ZONE_T.projects);
    expect(rain().at(-1)!).toBeCloseTo(RAIN_BED_GAIN, 6);
    followPath((ZONE_T.projects + ZONE_T.experience) / 2);
    expect(Math.max(...rain())).toBeLessThanOrEqual(RAIN_BED_GAIN + 1e-9);
    expect(rain().at(-1)!).toBeCloseTo(RAIN_BED_GAIN / 2, 6);
    ambient.mockRestore();
  });

  it('draws the rain drops only while the city has weight and they show: near ones alone in the crossing, the rest after', async () => {
    const { followPath, canvas, setPageOpen } = await cityPlayer();
    const at = (u: number) => ZONE_T.about + (ZONE_T.projects - ZONE_T.about) * u;
    const fillsAt = (t: number, frames = 1) => {
      const before = canvas.g.fills;
      for (let i = 0; i < frames; i++) followPath(t, 1 / 60);
      return (canvas.g.fills - before) / frames;
    };
    // The canvas is the view's size (pixel ratio 1 here).
    expect([canvas.width, canvas.height]).toEqual([1366, 768]);
    // Away from the city, and in the crossing before the rain stage: nothing drawn.
    expect(fillsAt(ZONE_T.experience)).toBe(0);
    expect(fillsAt(ZONE_T.about)).toBe(0);
    expect(fillsAt(at(0.5))).toBe(0);
    // The rain stage: its near drops only.
    const near = fillsAt(at(0.6), 5);
    expect(near).toBeGreaterThan(0);
    // At the stop, the far and close drops fade in too, so more groups are drawn each frame.
    fillsAt(ZONE_T.projects, 120);
    expect(fillsAt(ZONE_T.projects, 5)).toBeGreaterThan(near);
    // Under a page it holds its last frame: nothing more drawn.
    setPageOpen(true);
    expect(fillsAt(ZONE_T.projects, 5)).toBe(0);
    setPageOpen(false);
    expect(fillsAt(ZONE_T.projects)).toBeGreaterThan(0);
  });

  it('draws no rain drops with reduced motion', async () => {
    const { followPath, canvas } = await cityPlayer({ reduced: true });
    const before = canvas.g.fills;
    for (let i = 0; i < 10; i++) followPath(ZONE_T.projects, 1 / 60);
    expect(canvas.g.fills).toBe(before);
    expect(before).toBe(0);
  });

  it('runs the nightfall in its stages, each at 0 at both stops', async () => {
    const { followPath, veil, warm, magenta, rain, lights, city, cityBase } = await cityPlayer();
    const at = (u: number) => ZONE_T.about + (ZONE_T.projects - ZONE_T.about) * u;
    const shown = (el: { style: Record<string, string> }) => (el.style.visibility === 'visible' ? Number(el.style.opacity) : 0);
    followPath(ZONE_T.about);
    for (const el of [veil, warm, magenta, lights]) expect(shown(el)).toBe(0);
    // Sunset: warm, then magenta.
    followPath(at(0.12));
    expect(shown(warm)).toBeGreaterThan(0.2);
    expect(shown(veil)).toBe(0);
    followPath(at(0.3));
    expect(shown(magenta)).toBeGreaterThan(0.3);
    // Dusk: the veil at its peak while the pictures swap; no rain, no lights.
    followPath(at(0.5));
    expect(shown(veil)).toBeGreaterThan(0.9);
    expect(shown(rain)).toBe(0);
    expect(shown(lights)).toBe(0);
    // The rain begins in the dark, falling (only its near drops: the crossing marks it), the city still held.
    followPath(at(0.6));
    expect(shown(rain)).toBeGreaterThan(0);
    expect(shown(rain)).toBeLessThan(1);
    expect(rain.dataset.crossed).toBe('');
    expect(rain.dataset.motion).toBe('running');
    expect(city.dataset.motion).toBe('stopped');
    // The lights switch on, posed as the city's picture.
    followPath(at(0.68));
    expect(shown(lights)).toBeGreaterThan(0.5);
    expect(lights.style.transform).toBe(cityBase.image.style.transform);
    // The full city under its lights, then the lights go.
    followPath(at(0.9));
    expect(shown(veil)).toBe(0);
    expect(shown(lights)).toBe(0);
    expect(city.dataset.motion).toBe('running');
    followPath(ZONE_T.projects);
    for (const el of [veil, warm, magenta, lights]) expect(shown(el)).toBe(0);
    expect(shown(rain)).toBe(1);
    expect(rain.dataset.crossed).toBeUndefined();
  });

  it('takes a press on a sign surface for its project, and nothing in the sky between buildings', async () => {
    const { followPath, backdropObjectAt } = await cityPlayer();
    followPath(ZONE_T.projects);
    const { BACKDROPS, coverPoint, layerPose, posePoint } = await import('../../src/environment/backdrops');
    const { SIGNS } = await import('../../src/environment/city');
    const city = BACKDROPS.find((b) => b.zone === 'projects')!;
    const pose = layerPose(city.layers[0].depth, 1, 0, 0, city.horizon, 1366, 768);
    const view = ([x, y]: readonly [number, number]) =>
      posePoint(coverPoint(city, { x: x / 2048, y: y / 1750 }, 1366, 768), pose, city.horizon, 1366, 768);
    for (const sign of SIGNS) {
      const cx = sign.quad.reduce((s, [x]) => s + x, 0) / 4;
      const cy = sign.quad.reduce((s, [, y]) => s + y, 0) / 4;
      expect(backdropObjectAt(...view([cx, cy])), sign.page).toBe(sign.page);
    }
    // Open sky between the Art Deco spire and the second crane's mast, above both cranes.
    expect(backdropObjectAt(...view([1200, 300]))).toBeNull();
  });
});
