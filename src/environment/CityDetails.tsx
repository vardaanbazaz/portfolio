import { useMemo, type CSSProperties } from 'react';
import {
  BANNER_SWING_DEGREES,
  BANNER_SWING_SECONDS,
  BEACON_COLOR,
  BEACON_LIT_SHARE,
  BEACON_PERIOD_SECONDS,
  BEACON_PHASE_SPREAD,
  BEACON_SIZE_PX,
  BUILDING_LIGHT_IN_SECONDS,
  BUILDING_LIGHT_OUT_SECONDS,
  CAR_COLORS,
  CAR_FADE_SHARE,
  CAR_OPACITY,
  CAR_SIZE_PX,
  PROJECTS_FACE_CYCLE_SECONDS,
  PROJECTS_FACE_PULSE,
  PROJECTS_FACE_PULSE_SECONDS,
  PROJECTS_FACE_WAVE_BAND,
  PROJECTS_FACE_WAVE_OPACITY,
  PROJECTS_FACE_WAVE_SECONDS,
  SIGN_BLADE_SHADE,
  SIGN_FLOOD,
  WINDOW_COLOR,
  WINDOW_LIT_OPACITY,
} from '../scene/tuning';
import {
  AVENUE,
  BEACONS,
  CRANE_HOOK,
  cityTraffic,
  cityWindows,
  LED_FACE,
  quadFrom,
  quadMatrix,
  signName,
  SIGNS,
  WINDOW_SIZE,
  type CityPoint,
  type Sign,
} from './city';

/** The LED face's wave is laid out at this size before it is fitted to the face. */
const FACE_BOX = { width: 200, height: 900 };

/** One project's name on its building's sign: real text, laid out at the sign's own size and fitted to its painted
 *  corners by a perspective transform, so it sits on the surface. Brighter on hover and focus: a light colour laid
 *  over the sign, or on the violet face (where nothing dark is ever drawn) a brighter glow round the letters. */
function SignView({ sign, origin = [0, 0] }: { sign: Sign; origin?: CityPoint }) {
  const { width, height } = sign.size;
  const shade = sign.style === 'neon' ? SIGN_BLADE_SHADE : 0;
  const text = (className: string, lineClass: string) => (
    <div className={sign.vertical ? `${className} city-sign-vertical` : className}>
      {sign.lines.map((line) => (
        <span key={line} className={lineClass}>
          {line}
        </span>
      ))}
    </div>
  );
  return (
    <div
      className="city-sign"
      data-style={sign.style}
      data-marker={sign.page}
      data-name={signName(sign)}
      style={
        {
          width: `${width}px`,
          height: `${height}px`,
          transform: quadMatrix(width, height, quadFrom(sign.quad, origin)),
          fontSize: `${sign.fontPx}px`,
          '--sign-shade': shade,
          '--flood-top': SIGN_FLOOD[0],
          '--flood-bottom': SIGN_FLOOD[1],
        } as CSSProperties
      }
    >
      {shade > 0 && <div className="city-sign-shade" />}
      {sign.style === 'banner' && <div className="city-sign-flood" />}
      {text('city-sign-text', 'city-sign-line')}
      {sign.style === 'led' ? text('city-sign-text city-sign-light', 'city-sign-glow') : <div className="city-sign-light" />}
    </div>
  );
}

/**
 * What the night city has drawn over its painting, in the painting's px (the box it sits in is drawn where the cover
 * crop puts the painting): each project's name on its building, the banner hanging from the second crane's hook,
 * the violet face's wave of light, the aviation lights, the far windows and the cars on the avenue. Everything moves by
 * transform and opacity alone, and pauses with the world's motion.
 */
export function CityDetails() {
  const windows = useMemo(() => cityWindows(), []);
  const cars = useMemo(() => cityTraffic(), []);
  const hanging = SIGNS.find((sign) => sign.style === 'hanging')!;
  const [[x0, y0], [x1], [, y2]] = hanging.quad;
  const [hookX, hookY] = CRANE_HOOK;
  // The hanging banner's own small box, from the hook down, so its swing turns only that much.
  const group: CityPoint = [x0, hookY];
  const [[ax, ay], [bx, by]] = AVENUE;

  const style = {
    '--light-in': `${BUILDING_LIGHT_IN_SECONDS}s`,
    '--light-out': `${BUILDING_LIGHT_OUT_SECONDS}s`,
    '--beacon-color': BEACON_COLOR,
    '--beacon-period': `${BEACON_PERIOD_SECONDS}s`,
    '--window-color': WINDOW_COLOR,
    '--window-lit': WINDOW_LIT_OPACITY,
    '--car-width': `${CAR_SIZE_PX.width}px`,
    '--car-height': `${CAR_SIZE_PX.height}px`,
    '--car-toward': CAR_COLORS.toward,
    '--car-away': CAR_COLORS.away,
    '--face-wave-band': `${PROJECTS_FACE_WAVE_BAND * 100}%`,
    '--face-pulse-min': PROJECTS_FACE_PULSE[0],
    '--face-pulse-max': PROJECTS_FACE_PULSE[1],
    // One way of an alternating animation is half a period.
    '--face-pulse': `${PROJECTS_FACE_PULSE_SECONDS / 2}s`,
    '--face-cycle': `${PROJECTS_FACE_CYCLE_SECONDS}s`,
    '--face-wave-opacity': PROJECTS_FACE_WAVE_OPACITY,
    '--swing': `${BANNER_SWING_DEGREES}deg`,
    '--swing-half': `${BANNER_SWING_SECONDS / 2}s`,
  } as CSSProperties;

  // Keyframes whose stops come from the constants: the beacon is lit for its share of each period; the wave takes its
  // seconds of each cycle, rising from just below the face to just above it (by the face's height and its own, in
  // shares of its own height); a car fades in and out over its share of each run.
  const lit = BEACON_LIT_SHARE * 100;
  const wave = (PROJECTS_FACE_WAVE_SECONDS / PROJECTS_FACE_CYCLE_SECONDS) * 100;
  const rise = ((1 + PROJECTS_FACE_WAVE_BAND) / PROJECTS_FACE_WAVE_BAND) * 100;
  const fade = CAR_FADE_SHARE * 100;
  const keyframes =
    `@keyframes city-beacon { 0% { opacity: 0 } ${(lit / 3).toFixed(2)}%, ${((2 * lit) / 3).toFixed(2)}% { opacity: 1 } ` +
    `${lit.toFixed(2)}%, 100% { opacity: 0 } } ` +
    `@keyframes city-wave { 0% { transform: translate3d(0, 0, 0) } ${wave.toFixed(2)}%, 100% { transform: translate3d(0, -${rise.toFixed(2)}%, 0) } } ` +
    `@keyframes city-car { 0% { transform: translate3d(0, 0, 0); opacity: 0 } ${fade}%, ${100 - fade}% { opacity: ${CAR_OPACITY} } ` +
    `100% { transform: translate3d(var(--car-dx), var(--car-dy), 0); opacity: 0 } }`;

  return (
    <div className="city" style={style}>
      <style>{keyframes}</style>
      {windows.map(({ at: [x, y], period, phase }, i) => (
        <span
          key={i}
          className="city-window"
          style={{
            left: `${x}px`,
            top: `${y}px`,
            width: `${WINDOW_SIZE.width}px`,
            height: `${WINDOW_SIZE.height}px`,
            animationDuration: `${period.toFixed(2)}s`,
            animationDelay: `${(-phase * period).toFixed(2)}s`,
          }}
        />
      ))}
      {cars.map(({ toward, seconds, phase }, i) => (
        <span
          key={i}
          className="city-car"
          data-toward={toward ? '' : undefined}
          style={
            {
              left: `${toward ? ax : bx}px`,
              top: `${toward ? ay : by}px`,
              '--car-dx': `${toward ? bx - ax : ax - bx}px`,
              '--car-dy': `${toward ? by - ay : ay - by}px`,
              animationDuration: `${seconds.toFixed(2)}s`,
              animationDelay: `${(-phase * seconds).toFixed(2)}s`,
            } as CSSProperties
          }
        />
      ))}
      <div
        className="city-led-wave"
        style={{ width: `${FACE_BOX.width}px`, height: `${FACE_BOX.height}px`, transform: quadMatrix(FACE_BOX.width, FACE_BOX.height, LED_FACE) }}
      >
        <div className="city-led-band" />
      </div>
      {SIGNS.filter((sign) => sign !== hanging).map((sign) => (
        <SignView key={sign.page} sign={sign} />
      ))}
      {/* Turns about the hook: its cables and its banner with it. */}
      <div
        className="city-hanging"
        style={{
          left: `${x0}px`,
          top: `${hookY}px`,
          width: `${x1 - x0}px`,
          height: `${y2 - hookY}px`,
          transformOrigin: `${hookX - x0}px 0`,
        }}
      >
        <svg className="city-cables" width={x1 - x0} height={y0 - hookY} aria-hidden="true">
          <line x1={hookX - x0} y1={0} x2={6} y2={y0 - hookY} />
          <line x1={hookX - x0} y1={0} x2={x1 - x0 - 6} y2={y0 - hookY} />
        </svg>
        <SignView sign={hanging} origin={group} />
      </div>
      {BEACONS.map(([x, y], i) => (
        <span
          key={i}
          className="city-beacon"
          style={{
            left: `${x - BEACON_SIZE_PX / 2}px`,
            top: `${y - BEACON_SIZE_PX / 2}px`,
            width: `${BEACON_SIZE_PX}px`,
            height: `${BEACON_SIZE_PX}px`,
            // Each on its own phase, so they don't blink together.
            animationDelay: `${(-(i / BEACONS.length) * BEACON_PERIOD_SECONDS * BEACON_PHASE_SPREAD).toFixed(2)}s`,
          }}
        />
      ))}
    </div>
  );
}
