import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BACKDROP_FADE_IN_SECONDS,
  BLOOM_DRAWN_PX,
  BLOOM_STOPS,
  MIST_HEIGHT,
  MIST_LOOP_SECONDS,
  MIST_OPACITY,
  MOTE_COLOR,
  OBJECT_BLOOM_OPACITY,
  OBJECT_GLOW_HOVER_OPACITY,
  OBJECT_GLOW_HOVER_SECONDS,
  OBJECT_GLOW_OPACITY,
  OBJECT_GLOW_PERIOD_SECONDS,
  OBJECT_GLOW_STILL_OPACITY,
  SHIMMER_OPACITY,
  SHIMMER_PERIOD_SECONDS,
} from '../scene/tuning';
import type { FrameValue } from '../visuals/shared';
import mist from './assets/mist.webp';
import { followPath, registerBackdrop, registerBackdropObject, registerBloom, setPageOpen } from './backdropPlayer';
import { BACKDROPS, FIRST_BACKDROP, moteField, starField, type BackdropObject, type Star, type ZoneBackdrop } from './backdrops';

/** Draws the stars that don't twinkle into an image the size of `el`, returned as a data URL: drawn on an off-page
 *  canvas, so the scene's canvas stays the page's only one, and encoded at once, so nothing is requested later. Each
 *  star is a single device pixel or more, snapped to the pixel grid so it stays crisp. */
function drawStill(el: HTMLElement, stars: readonly Star[]): string {
  const ratio = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(el.clientWidth * ratio);
  canvas.height = Math.round(el.clientHeight * ratio);
  const g = canvas.getContext('2d');
  if (!g) return '';
  for (const star of stars) {
    const side = Math.max(1, Math.round(star.size * ratio));
    g.globalAlpha = star.max;
    g.fillStyle = star.color;
    g.fillRect(Math.round(star.x * canvas.width), Math.round(star.y * canvas.height), side, side);
  }
  return canvas.toDataURL();
}

/** A change in the view's height smaller than this share (a phone's address bar showing or hiding) only stretches
 *  the drawn image a little, and isn't worth drawing it again for. */
const STILL_REDRAW_HEIGHT_SHARE = 0.15;

/** Points in the sky, fixed by the seed so they sit still between loads. The many tiny ones are drawn once into an
 *  image, again only when the view changes size enough to matter; the few larger ones are elements, each fading on
 *  its own period. */
function Stars({ horizon, glowX }: { horizon: number; glowX: number }) {
  const stars = useMemo(() => starField(horizon, glowX), [horizon, glowX]);
  const still = useMemo(() => stars.filter((star) => !star.twinkles), [stars]);
  const image = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = image.current;
    if (!el) return;
    let width = 0;
    let height = 0;
    const observer = new ResizeObserver(() => {
      // Nothing to draw while it takes no room; an image drawn then would be stretched over the sky later.
      if (!el.clientWidth || !el.clientHeight) return;
      if (el.clientWidth === width && Math.abs(el.clientHeight - height) <= height * STILL_REDRAW_HEIGHT_SHARE) return;
      width = el.clientWidth;
      height = el.clientHeight;
      el.src = drawStill(el, still);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [still]);

  return (
    <div className="backdrop-stars">
      <img ref={image} className="backdrop-stars-still" alt="" draggable={false} data-count={still.length} />
      {stars
        .filter((star) => star.twinkles)
        .map((star, i) => (
          <span
            key={i}
            className="backdrop-star"
            data-tier={star.tier}
            style={
              {
                left: `${(star.x * 100).toFixed(2)}%`,
                top: `${(star.y * 100).toFixed(2)}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                background: star.color,
                '--star-min': star.min,
                '--star-max': star.max,
                // One way of an alternating animation is half a period; a negative delay starts it part way through.
                animationDuration: `${(star.period / 2).toFixed(3)}s`,
                animationDelay: `${(-star.phase * star.period).toFixed(3)}s`,
              } as CSSProperties
            }
          />
        ))}
    </div>
  );
}

/** Soft warm points drifting slowly up and sideways in the light, each on its own period, fixed by the seed. */
function Motes({ sunX }: { sunX: number }) {
  const motes = useMemo(() => moteField(sunX), [sunX]);
  return (
    <div className="backdrop-motes">
      {motes.map((mote, i) => (
        <span
          key={i}
          className="backdrop-mote"
          style={
            {
              left: `${(mote.x * 100).toFixed(2)}%`,
              top: `${(mote.y * 100).toFixed(2)}%`,
              width: `${mote.size.toFixed(1)}px`,
              height: `${mote.size.toFixed(1)}px`,
              '--mote-opacity': mote.opacity.toFixed(3),
              '--mote-rise': `${mote.rise.toFixed(1)}px`,
              '--mote-drift': `${mote.drift.toFixed(1)}px`,
              animationDuration: `${mote.period.toFixed(2)}s`,
              animationDelay: `${(-mote.phase * mote.period).toFixed(2)}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** An image's source: the first world's at once; every other world's waits in `data-src` until the player loads that
 *  world, after the visitor has entered. */
const source = (zone: ZoneBackdrop['zone'], src: string) => (zone === FIRST_BACKDROP.zone ? { src } : { 'data-src': src });

/** The bloom's light from its centre out, drawn once. */
const BLOOM_GRADIENT = `radial-gradient(closest-side, ${BLOOM_STOPS.map(([at, rgb, alpha]) => `rgb(${rgb} / ${alpha}) ${at * 100}%`).join(', ')})`;

/** One object painted in the backdrop: on a plane the player poses as the object's layer, a box over its rect that
 *  holds its light (its glow image and a soft bloom, added over the picture, breathing), with a brighter copy that
 *  fades in on hover. The picture itself already shows the object. */
function BackdropObjectView({ zone, index, object }: { zone: ZoneBackdrop['zone']; index: number; object: BackdropObject }) {
  const plane = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    registerBackdropObject(zone, index, { plane: plane.current, box: box.current });
    return () => registerBackdropObject(zone, index, { plane: null, box: null });
  }, [zone, index]);

  const { glow } = object;
  const bloom = glow?.bloom;
  const style = bloom && {
    '--glow-min': OBJECT_GLOW_OPACITY[0],
    '--glow-max': OBJECT_GLOW_OPACITY[1],
    '--glow-still': OBJECT_GLOW_STILL_OPACITY,
    '--glow-hover': OBJECT_GLOW_HOVER_OPACITY,
    '--glow-hover-fade': `${OBJECT_GLOW_HOVER_SECONDS}s`,
    // One way of an alternating animation is half a period.
    '--glow-breath': `${OBJECT_GLOW_PERIOD_SECONDS / 2}s`,
    '--bloom-opacity': OBJECT_BLOOM_OPACITY,
    '--bloom-left': `${((bloom.x - bloom.rx) * 100).toFixed(3)}%`,
    '--bloom-top': `${((bloom.y - bloom.ry) * 100).toFixed(3)}%`,
    '--bloom-width': `${(bloom.rx * 200).toFixed(3)}%`,
    '--bloom-height': `${(bloom.ry * 200).toFixed(3)}%`,
  } as CSSProperties;
  const light = (hover: boolean) =>
    glow && (
      <div className={hover ? 'backdrop-object-light backdrop-object-light-hover' : 'backdrop-object-light'}>
        <div className="backdrop-object-bloom" />
        <img className="backdrop-object-glow" {...source(zone, glow.src)} alt="" decoding="async" draggable={false} />
      </div>
    );

  return (
    <div ref={plane} className="backdrop-object-plane">
      {/* Its outline is small enough to come inlined; it is named here so a test can read the mask presses use. */}
      <div ref={box} className="backdrop-object" data-marker={object.marker} data-outline={object.outline} style={style}>
        {light(false)}
        {light(true)}
      </div>
    </div>
  );
}

function BackdropLayer({ backdrop }: { backdrop: ZoneBackdrop }) {
  const layer = useRef<HTMLDivElement>(null);
  const images = useRef<(HTMLImageElement | null)[]>([]);

  useLayoutEffect(() => {
    registerBackdrop(backdrop.zone, layer.current, images.current.slice(0, backdrop.layers.length));
    return () => registerBackdrop(backdrop.zone, null, []);
  }, [backdrop]);

  const style = {
    '--horizon': `${backdrop.horizon * 100}%`,
    '--focus-x': `${backdrop.focusX * 100}%`,
    '--focus-x-portrait': `${backdrop.portraitFocusX * 100}%`,
    '--effect-fade': `${BACKDROP_FADE_IN_SECONDS}s`,
    '--mist-height': `${MIST_HEIGHT * 100}%`,
    '--mist-opacity': MIST_OPACITY,
    '--mist-loop': `${MIST_LOOP_SECONDS}s`,
    '--mist-image': `url(${mist})`,
    ...(backdrop.mistTint && { '--mist-tint': backdrop.mistTint }),
    ...(backdrop.mistFade && { '--mist-whole': `${backdrop.mistFade[0] * 100}%`, '--mist-gone': `${backdrop.mistFade[1] * 100}%` }),
    '--shimmer-min': SHIMMER_OPACITY[0],
    '--shimmer-max': SHIMMER_OPACITY[1],
    '--shimmer-breath': `${SHIMMER_PERIOD_SECONDS / 2}s`,
    '--mote-color': MOTE_COLOR,
    ...(backdrop.sun && { '--sun-at': `${backdrop.sun.x * 100}% ${backdrop.sun.y * 100}%` }),
  } as CSSProperties;

  return (
    <div ref={layer} className="backdrop" data-zone={backdrop.zone} data-motion="stopped" style={style}>
      {backdrop.layers.map(({ src }, i) => (
        <Fragment key={src}>
          <img
            ref={(el) => {
              images.current[i] = el;
            }}
            className="backdrop-image"
            {...source(backdrop.zone, src)}
            alt=""
            decoding="async"
            draggable={false}
          />
          {i === 0 && backdrop.effects.includes('stars') && <Stars horizon={backdrop.horizon} glowX={backdrop.focusX} />}
        </Fragment>
      ))}
      {backdrop.effects.includes('mist') && (
        <div className="backdrop-mist-band" data-fade={backdrop.mistFade ? '' : undefined}>
          <div className="backdrop-mist" data-tinted={backdrop.mistTint ? '' : undefined} />
        </div>
      )}
      {backdrop.objects?.map((object, i) => (
        <BackdropObjectView key={object.marker} zone={backdrop.zone} index={i} object={object} />
      ))}
      {(backdrop.effects.includes('shimmer') || backdrop.effects.includes('motes')) && (
        <div className="backdrop-light">
          {backdrop.effects.includes('shimmer') && <div className="backdrop-shimmer" />}
          {backdrop.effects.includes('motes') && <Motes sunX={backdrop.sun?.x ?? backdrop.focusX} />}
        </div>
      )}
      <div className="backdrop-shade" />
    </div>
  );
}

/** Each zone's backdrop, behind the transparent canvas. Faded and moved by `backdropPlayer`. */
export function Backdrops({ pageOpen }: { pageOpen: boolean }) {
  useEffect(() => setPageOpen(pageOpen), [pageOpen]);
  return (
    <div className="backdrops" aria-hidden="true">
      {BACKDROPS.map((backdrop) => (
        <BackdropLayer key={backdrop.zone} backdrop={backdrop} />
      ))}
      {/* Over every backdrop: the bloom two neighbouring worlds crossfade under. */}
      <div
        ref={registerBloom}
        className="backdrop-bloom"
        style={{ width: `${BLOOM_DRAWN_PX}px`, height: `${BLOOM_DRAWN_PX}px`, background: BLOOM_GRADIENT }}
      />
    </div>
  );
}

/** Inside the canvas: moves every backdrop to this frame's path position. */
export function BackdropTracker({ pathT }: { pathT: FrameValue<number> }) {
  useFrame((_, delta) => followPath(pathT.current, delta));
  return null;
}
