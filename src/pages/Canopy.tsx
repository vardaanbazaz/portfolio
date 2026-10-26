import { useEffect, useRef, type CSSProperties } from 'react';
import { MOTE_COLOR } from '../scene/tuning';
import canopyImage from './assets/about-canopy.webp';
import canopyImageSmall from './assets/about-canopy-960.webp';
import {
  ABOUT_HEADING_COLOR,
  ABOUT_SOURCE_COLOR,
  ABOUT_TEXT_COLOR,
  CANOPY_CORE,
  CANOPY_FADE,
  CANOPY_FOCUS_X,
  CANOPY_IMAGE_ASPECT,
  CANOPY_DIM_DISTANCE,
  CANOPY_DIM_EASING,
  CANOPY_DIM_FALLBACK,
  CANOPY_DIM_MIN,
  CANOPY_MIN_HEIGHT_VH,
  CANOPY_SHADE_BOTTOM,
  CANOPY_SHADE_TOP,
  CANOPY_SPOT_OPACITY,
  CANOPY_WASH_COLOR,
  CANOPY_WASH_OPACITY,
  CANOPY_WASH_SECONDS,
  DIVIDER_COLOR,
  DIVIDER_OPACITY,
  DIVIDER_SPIRAL_RADIUS_PX,
  DIVIDER_STROKE_PX,
  GLOW_OPACITY,
  GLOW_PERIOD_SECONDS,
  GLOW_WIDTH,
  TEXT_SHADE_COLOR,
  TEXT_SHADE_FEATHER_PX,
  TEXT_SHADE_OPACITY,
  canopyMotes,
  canopySpots,
  fadeMask,
  glowBackground,
  spiralPath,
  spotKeyframes,
  type TextShadeBlock,
} from './canopy';

/** The About page's colours and the canopy's timings, as the custom properties `index.css` reads under `.about`. */
export const CANOPY_STYLE = {
  '--about-text': ABOUT_TEXT_COLOR,
  '--about-heading': ABOUT_HEADING_COLOR,
  '--about-source': ABOUT_SOURCE_COLOR,
  '--canopy-top': CANOPY_SHADE_TOP,
  '--canopy-bottom': CANOPY_SHADE_BOTTOM,
  '--canopy-wash': CANOPY_WASH_COLOR,
  '--canopy-wash-opacity': CANOPY_WASH_OPACITY,
  '--canopy-wash-duration': `${CANOPY_WASH_SECONDS}s`,
  '--divider-color': DIVIDER_COLOR,
  '--divider-opacity': DIVIDER_OPACITY,
  '--mote-color': MOTE_COLOR,
  '--crown-aspect': `${1 / CANOPY_IMAGE_ASPECT}`,
  '--crown-min-height': `${CANOPY_MIN_HEIGHT_VH}vh`,
  '--crown-focus-x': `${CANOPY_FOCUS_X * 100}%`,
  '--crown-mask': fadeMask(CANOPY_FADE),
  '--canopy-dim-min': CANOPY_DIM_MIN,
  '--canopy-dim-fallback': CANOPY_DIM_FALLBACK,
  '--canopy-dim-range': `${CANOPY_DIM_DISTANCE * 100}vh`,
  '--canopy-dim-easing': CANOPY_DIM_EASING,
  '--spot-dim': CANOPY_SPOT_OPACITY.dim,
  '--glow-x': `${CANOPY_CORE.x * 100}%`,
  '--glow-y': `${CANOPY_CORE.y * 100}%`,
  '--glow-width': `${GLOW_WIDTH * 100}%`,
  '--glow-rest': GLOW_OPACITY.rest,
  '--glow-bright': GLOW_OPACITY.bright,
  '--glow-duration': `${GLOW_PERIOD_SECONDS}s`,
  '--text-shade': TEXT_SHADE_COLOR,
  '--text-shade-feather': `${TEXT_SHADE_FEATHER_PX}px`,
} as CSSProperties;

/** The painting at two widths. Drawn the page's width, or wider where the view is taller than the painting, so the
 *  browser picks by that width; `warmCanopy` asks with the same pair, so the page reuses what it fetched. */
const SRCSET = `${canopyImageSmall} 960w, ${canopyImage} 1920w`;
const PLATE_VH = CANOPY_MIN_HEIGHT_VH / CANOPY_IMAGE_ASPECT;
const SIZES = `(max-aspect-ratio: ${Math.round(PLATE_VH * 100)}/10000) ${PLATE_VH.toFixed(2)}vh, 100vw`;

/** Starts fetching the painting, as the page's `<img>` would. Called when the page's marker is hovered, focused or
 *  pressed (see `src/preload.ts`), never when the page's code merely loads in the background. */
export function warmCanopy() {
  const image = new Image();
  image.decoding = 'async';
  image.sizes = SIZES;
  image.srcset = SRCSET;
  image.src = canopyImage;
}

/** A block's local shade at its own opacity: the style for the block that carries `.text-shade`. */
export const textShade = (block: TextShadeBlock) => ({ '--text-shade-opacity': TEXT_SHADE_OPACITY[block] }) as CSSProperties;

const MOTES = canopyMotes();
const SPOTS = canopySpots();
const SPOT_KEYFRAMES = spotKeyframes();
const GLOW = glowBackground();
const SPIRAL = spiralPath();
const SPIRAL_SIZE = DIVIDER_SPIRAL_RADIUS_PX * 2;

/** The shade behind the page, fixed to the view, and over it the painting of the canopy, also fixed, dimming as the
 *  page scrolls and fading into the shade, and holding still; over it the glow, the spots and the motes. Only transform and
 *  opacity animate. The spots' flicker is started here (its shape is in `canopy.ts`) and runs on the compositor; the
 *  rest is CSS. Everything pauses while the tab is hidden (`data-motion` on the painting, as the scene's backdrops
 *  do), the spots hold at dim with reduced motion, and nothing runs once the page has closed and unmounted it. */
export function Canopy() {
  const crown = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = crown.current;
    if (!layer) return;
    const spots = [...layer.querySelectorAll<HTMLElement>('.canopy-spot')];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let flickers: Animation[] = [];
    const update = () => {
      const running = document.visibilityState === 'visible';
      layer.dataset.motion = running ? 'running' : 'stopped';
      if (reduced.matches) {
        for (const flicker of flickers) flicker.cancel();
        flickers = [];
        return;
      }
      if (!flickers.length) {
        flickers = SPOTS.map((spot, i) =>
          spots[i].animate(SPOT_KEYFRAMES, {
            id: 'canopy-spot',
            duration: spot.period * 1000,
            delay: -spot.phase * spot.period * 1000,
            iterations: Infinity,
          }),
        );
      }
      for (const flicker of flickers) {
        if (running) flicker.play();
        else flicker.pause();
      }
    };
    update();
    document.addEventListener('visibilitychange', update);
    reduced.addEventListener('change', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      reduced.removeEventListener('change', update);
      for (const flicker of flickers) flicker.cancel();
    };
  }, []);

  return (
    <>
      <div className="canopy" aria-hidden="true" />
      <div ref={crown} className="canopy-crown" aria-hidden="true">
        <div className="canopy-plate">
          <img className="canopy-image" src={canopyImage} srcSet={SRCSET} sizes={SIZES} alt="" decoding="async" />
          <div className="canopy-glow" style={{ background: GLOW }} />
          {SPOTS.map((spot, i) => (
            <span
              key={i}
              className="canopy-spot"
              style={{
                left: `${(spot.x * 100).toFixed(2)}%`,
                top: `${(spot.y * 100).toFixed(2)}%`,
                width: `${(spot.size * 100).toFixed(2)}%`,
                background: GLOW,
              }}
            />
          ))}
          <div className="canopy-motes">
            {MOTES.map((mote, i) => (
              <span
                key={i}
                className="backdrop-mote canopy-mote"
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
        </div>
      </div>
      <div className="canopy-wash" aria-hidden="true" />
    </>
  );
}

/** A thin line with a small spiral at its centre, between the page's parts. Decoration only: hidden from assistive
 *  technology, and it holds no text. */
export function SpiralDivider() {
  return (
    <div className="spiral-divider" aria-hidden="true">
      <svg width={SPIRAL_SIZE} height={SPIRAL_SIZE} viewBox={`0 0 ${SPIRAL_SIZE} ${SPIRAL_SIZE}`} focusable="false">
        <path d={SPIRAL} fill="none" stroke="currentColor" strokeWidth={DIVIDER_STROKE_PX} strokeLinecap="round" />
      </svg>
    </div>
  );
}
