import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import { useFrame } from '@react-three/fiber';
import { BACKDROP_FADE_IN_SECONDS, MIST_HEIGHT, MIST_LOOP_SECONDS, MIST_OPACITY } from '../scene/tuning';
import type { FrameValue } from '../visuals/shared';
import mist from './assets/mist.webp';
import { followPath, registerBackdrop, setPageOpen } from './backdropPlayer';
import { BACKDROPS, starField, type ZoneBackdrop } from './backdrops';

/** Faint points in the sky, each fading on its own period. Fixed by the seed, so they sit still between loads. */
function Stars() {
  const stars = useMemo(() => starField(), []);
  return (
    <div className="backdrop-stars">
      {stars.map((star, i) => (
        <span
          key={i}
          className="backdrop-star"
          style={
            {
              left: `${(star.x * 100).toFixed(2)}%`,
              top: `${(star.y * 100).toFixed(2)}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
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
          {i === 0 && backdrop.effects.includes('stars') && <Stars />}
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
