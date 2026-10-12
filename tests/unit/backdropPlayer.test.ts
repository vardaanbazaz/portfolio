import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKDROP_PLAY_RETRY_SECONDS } from '../../src/scene/tuning';

/** A stand-in for a video element: records play() calls and settles each one as the test says. */
function fakeVideo() {
  const calls: { resolve: () => void; reject: (error: unknown) => void }[] = [];
  const video = {
    paused: true,
    play: vi.fn(
      () =>
        new Promise<void>((resolve, reject) => {
          calls.push({
            resolve: () => {
              video.paused = false;
              resolve();
            },
            reject,
          });
        }),
    ),
    pause: vi.fn(() => {
      video.paused = true;
    }),
  };
  return { video, calls };
}

const fakeLayer = () => ({ style: { visibility: '', opacity: '' } });

/** A fresh player (its state is module-wide), released as after the loading screen, with the landing registered. */
async function player() {
  vi.resetModules();
  const module = await import('../../src/environment/backdropPlayer');
  const { video, calls } = fakeVideo();
  const layer = fakeLayer();
  module.registerBackdrop('landing', layer as unknown as HTMLElement, video as unknown as HTMLVideoElement);
  module.releaseBackdrops();
  return { ...module, layer, video, calls };
}

/** Lets settled promises run their handlers. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

let now = 0;
beforeEach(() => {
  now = 1_000;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
});
afterEach(() => vi.restoreAllMocks());

describe('backdropPlayer at the landing, once the camera has settled', () => {
  it('plays a video the browser paused, though the path has not moved', async () => {
    const { followPath, video, calls } = await player();
    followPath(0);
    calls[0].resolve();
    await flush();
    followPath(0);
    expect(video.play).toHaveBeenCalledTimes(1);

    video.paused = true;
    followPath(0);
    expect(video.play).toHaveBeenCalledTimes(2);
  });

  it('starts no second play() while one is under way', async () => {
    const { followPath, video } = await player();
    for (let i = 0; i < 5; i++) followPath(0);
    expect(video.play).toHaveBeenCalledTimes(1);
  });

  it('tries a refused play() again after the retry delay, not every frame', async () => {
    const { followPath, video, calls } = await player();
    followPath(0);
    calls[0].reject(new DOMException('no', 'NotAllowedError'));
    await flush();
    for (let i = 0; i < 5; i++) followPath(0);
    expect(video.play).toHaveBeenCalledTimes(1);
    now += BACKDROP_PLAY_RETRY_SECONDS * 1000;
    followPath(0);
    expect(video.play).toHaveBeenCalledTimes(2);
  });

  it('tries again at once after a play() cut short by pause()', async () => {
    const { followPath, video, calls } = await player();
    followPath(0);
    calls[0].reject(new DOMException('interrupted', 'AbortError'));
    await flush();
    followPath(0);
    expect(video.play).toHaveBeenCalledTimes(2);
  });

  it('pauses the video once the landing has no weight, and leaves it paused there', async () => {
    const { followPath, video, calls } = await player();
    followPath(0);
    calls[0].resolve();
    await flush();
    followPath(1);
    expect(video.pause).toHaveBeenCalledTimes(1);
    followPath(1);
    expect(video.play).toHaveBeenCalledTimes(1);
  });
});

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
