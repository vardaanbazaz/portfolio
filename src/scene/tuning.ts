/** Feel constants. Change values here only; nothing else defines its own scroll easing. */

/**
 * How quickly the camera eases toward the scroll position, per second.
 * Higher is snappier, lower glides more. 4 closes about 98% of the gap in one second.
 * Infinity makes the camera follow the scroll exactly (debugging only).
 */
export const CAMERA_DAMPING = 4;

/** Page height in viewport heights; more pages means more scrolling per stop. */
export const SCROLL_PAGES = 9;

/** How far ahead on the path (in t) the camera looks between stops. */
export const LOOK_AHEAD = 0.06;

/** Distance in t over which a stop's proximity rises from 0 to 1. */
export const STOP_PROXIMITY_RADIUS = 0.12;

/** How far the camera turns toward a stop at full proximity (0 = never, 1 = straight at it). */
export const STOP_LOOK_WEIGHT = 0.85;

/** Vertical field of view in degrees on landscape screens. */
export const BASE_FOV = 50;

/** Portrait screens widen the field of view up to this many degrees. */
export const MAX_FOV = 75;

/** On portrait screens the camera steps back by this much per unit of (1 / aspect - 1), up to the max. */
export const PORTRAIT_PULLBACK = 2;
export const PORTRAIT_PULLBACK_MAX = 3;

/** Viewports narrower than this start at quality 'low'. */
export const NARROW_VIEWPORT_PX = 768;

/** Device pixel ratio range at quality 'high', and the cap after a frame-rate drop. */
export const DPR_RANGE: [min: number, max: number] = [1, 1.5];
export const DPR_LOW = 1;

/** Sustained average frame rate below this drops quality to 'low' for the rest of the session. */
export const PERF_DECLINE_BELOW_FPS = 45;

/** Seconds for the camera to fly from the path to a stop's inspect pose (and back). */
export const FLY_SECONDS = 0.8;

/** Seconds for a page overlay to fade in or out. */
export const OVERLAY_SECONDS = 0.25;

/** Inspect pose: distance multiplier on the fit-to-frame distance, and how far above level the camera sits (0 = level). */
export const INSPECT_MARGIN = 1.35;
export const INSPECT_ELEVATION = 0.35;

/** A stop's marker is hidden below this proximity, so off-screen markers can't be tabbed to. */
export const MARKER_MIN_PROXIMITY = 0.2;
