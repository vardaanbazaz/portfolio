import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useFrame } from '@react-three/fiber';
import { BACKDROP_FADE_IN_SECONDS, MIST_HEIGHT, MIST_LOOP_SECONDS, MIST_OPACITY } from '../scene/tuning';
import type { FrameValue } from '../visuals/shared';
import mist from './assets/mist.webp';
import { followPath, registerBackdrop, setPageOpen } from './backdropPlayer';
import { BACKDROPS, starField, type Star, type ZoneBackdrop } from './backdrops';

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
            src={src}
            alt=""
            decoding="async"
            draggable={false}
          />
          {i === 0 && backdrop.effects.includes('stars') && <Stars horizon={backdrop.horizon} glowX={backdrop.focusX} />}
        </Fragment>
      ))}
      {backdrop.effects.includes('mist') && <div className="backdrop-mist" />}
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
    </div>
  );
}

/** Inside the canvas: moves every backdrop to this frame's path position. */
export function BackdropTracker({ pathT }: { pathT: FrameValue<number> }) {
  useFrame((_, delta) => followPath(pathT.current, delta));
  return null;
}
