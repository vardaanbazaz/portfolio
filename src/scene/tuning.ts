/** Feel constants. Change values here only; nothing else defines its own scroll easing. */

/** The loading screen lifts at the latest this many seconds after the scene's first frame, even if some page and
 *  panel chunks haven't arrived yet. Their fetch carries on, and a page still waiting shows its own loading line. */
export const LOADING_SCREEN_LIMIT_SECONDS = 4;

/** Seconds for the loading screen to fade out (none with reduced motion). */
export const LOADING_SCREEN_FADE_SECONDS = 0.3;

/**
 * How quickly the camera eases toward the scroll position, per second.
 * Higher is snappier, lower glides more. 4 closes about 98% of the gap in one second.
 * Infinity makes the camera follow the scroll exactly (debugging only).
 */
export const CAMERA_DAMPING = 4;

/** Page height in viewport heights; more pages means more scrolling per section.
 *  15 keeps about the same scroll distance between neighbouring sections as the three-stop prototype had. */
export const SCROLL_PAGES = 15;

/** Menu travel: the scroll position glides to the chosen section, taking this many seconds per section gap,
 *  clamped to the min and max. The camera then eases after the scroll as usual. */
export const MENU_TRAVEL_SECONDS_PER_GAP = 3;
export const MENU_TRAVEL_MIN_SECONDS = 2;
export const MENU_TRAVEL_MAX_SECONDS = 12;
export const MENU_TRAVEL_EASE = 'linear' as const;

/** How far ahead on the path (in t) the camera looks between sections. */
export const LOOK_AHEAD = 0.06;

/** Distance in t over which a section's proximity rises from 0 to 1. Also when its title and one-liner show.
 *  At most half the gap between neighbouring sections, so two never overlap. */
export const SECTION_PROXIMITY_RADIUS = 0.09;

/** How far the camera turns toward a section at full proximity (0 = never, 1 = straight at it). */
export const SECTION_LOOK_WEIGHT = 0.85;

/** Path position (t) by which the landing text has faded out. */
export const LANDING_FADE_T = 0.08;

/** End of the landing stretch (t). Before it the URL carries no section hash; from it on, the nearest section's. */
export const LANDING_STRETCH_T = 0.1;

/** A section is not drawn while its bounding sphere is further than this from the camera.
 *  No zone's fog reaches further at that quality (a unit test checks), so a section is culled only once fog hides it. */
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

/** Seconds for a zone's backdrop video to fade in over its poster once it is playing. It drops back to the poster at
 *  once whenever it stops. */
export const BACKDROP_FADE_IN_SECONDS = 1.2;

/** Seconds a playing backdrop video may wait for data before its poster shows instead. Longer than the brief wait
 *  at each loop seam, so the video doesn't dip there. */
export const BACKDROP_STALL_SECONDS = 0.5;

/** Seconds before a backdrop video's play() is tried again after the browser refused it. */
export const BACKDROP_PLAY_RETRY_SECONDS = 1;

/** Gain of a zone's ambient bed at full zone weight (0 to 1). Measured (EBU R128): the landing bed's file is
 *  -24.1 LUFS, so 0.25 plays it at about -36 LUFS, some 15 LU under the sweep's loudest moment (-21.3 LUFS). */
export const AMBIENT_GAIN = 0.25;

/** Time constant, in seconds, with which the ambient level follows the zone weight as the visitor scrolls. */
export const AMBIENT_FOLLOW_SECONDS = 0.25;

/** Time constant, in seconds, of the ambient fade as a full page opens or closes, and as mute is toggled. */
export const AMBIENT_FADE_SECONDS = 0.6;
