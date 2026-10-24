import type { CSSProperties } from 'react';
import { MOTE_COLOR } from '../scene/tuning';
import {
  ABOUT_HEADING_COLOR,
  ABOUT_SOURCE_COLOR,
  ABOUT_TEXT_COLOR,
  CANOPY_SHADE_BOTTOM,
  CANOPY_SHADE_TOP,
  CANOPY_WASH_COLOR,
  CANOPY_WASH_OPACITY,
  CANOPY_WASH_SECONDS,
  DIVIDER_COLOR,
  DIVIDER_OPACITY,
  DIVIDER_SPIRAL_RADIUS_PX,
  DIVIDER_STROKE_PX,
  PATCH_OPACITY,
  PATCHES,
  canopyMotes,
  patchBackground,
  spiralPath,
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
} as CSSProperties;

const MOTES = canopyMotes();
const SPIRAL = spiralPath();
const SPIRAL_SIZE = DIVIDER_SPIRAL_RADIUS_PX * 2;

/** The shade behind the page: fixed to the view while the page scrolls over it, drawn under the page's text. Only
 *  transform and opacity animate, in CSS, so nothing runs once the page has closed and unmounted it. */
export function Canopy() {
  return (
    <div className="canopy" aria-hidden="true">
      {PATCHES.map((patch, i) => (
        <span
          key={i}
          className="canopy-patch"
          style={
            {
              left: `${(patch.x * 100).toFixed(2)}%`,
              top: `${(patch.y * 100).toFixed(2)}%`,
              width: `${patch.w}vmax`,
              height: `${patch.h}vmax`,
              background: patchBackground(patch),
              '--patch-dim': (patch.strength * PATCH_OPACITY.dim).toFixed(4),
              '--patch-rest': (patch.strength * PATCH_OPACITY.rest).toFixed(4),
              '--patch-bright': (patch.strength * PATCH_OPACITY.bright).toFixed(4),
              '--patch-dx': `${patch.dx}vmax`,
              '--patch-dy': `${patch.dy}vmax`,
              animationDuration: `${patch.period}s`,
              animationDelay: `${(-patch.phase * patch.period).toFixed(2)}s`,
            } as CSSProperties
          }
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
      <div className="canopy-wash" />
    </div>
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
