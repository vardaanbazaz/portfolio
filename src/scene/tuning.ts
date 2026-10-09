/** Feel constants. Change values here only; nothing else defines its own scroll easing. */

/**
 * How quickly the camera eases toward the scroll position, per second.
 * Higher is snappier, lower glides more. 4 closes about 98% of the gap in one second.
 * Infinity makes the camera follow the scroll exactly (debugging only).
 */
export const CAMERA_DAMPING = 4;

/** Page height in viewport heights; more pages means more scrolling per section.
 *  15 keeps about the same scroll distance between neighbouring sections as the three-stop prototype had. */
export const SCROLL_PAGES = 15;

/** How far ahead on the path (in t) the camera looks between sections. */
export const LOOK_AHEAD = 0.06;

/** Distance in t over which a section's proximity rises from 0 to 1. Also when its title and one-liner show.
 *  At most half the gap between neighbouring sections, so two never overlap. */
export const SECTION_PROXIMITY_RADIUS = 0.09;

/** How far the camera turns toward a section at full proximity (0 = never, 1 = straight at it). */
export const SECTION_LOOK_WEIGHT = 0.85;

/** Path position (t) by which the landing text has faded out. */
export const LANDING_FADE_T = 0.08;

/** A section is not drawn while its bounding sphere is further than this from the camera.
 *  Matches the grey-box fog's far distance per quality, so a section is culled only once fog hides it. */
export const CULL_DISTANCE = { high: 45, low: 30 } as const;

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

/** Seconds for the camera to fly from the path to a marker's inspect pose (and back). */
export const FLY_SECONDS = 0.8;

/** Seconds for the view to fade between the scene and a page. */
export const PAGE_FADE_SECONDS = 0.25;

/** Inspect pose: distance multiplier on the fit-to-frame distance, and how far above level the camera sits (0 = level). */
export const INSPECT_MARGIN = 1.35;
export const INSPECT_ELEVATION = 0.35;

/** A marker is hidden below this section proximity, so off-screen markers can't be tabbed to. */
export const MARKER_MIN_PROXIMITY = 0.2;

/** Height of a marker button's anchor above the top of its box. */
export const MARKER_LIFT = 0.4;

/** Length in seconds of the fly-in and fly-out sweep. Long enough that a speaker waking up can't swallow it. */
export const SWEEP_SECONDS = 0.35;

/** Peak gain of the sweep (0 to 1). */
export const SWEEP_PEAK_GAIN = 0.5;
