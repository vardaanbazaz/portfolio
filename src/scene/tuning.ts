/** Feel constants. Change values here only; nothing else defines its own scroll easing. */

/** The loading screen lifts at the latest this many seconds after the scene's first frame, even if some page and
 *  panel chunks haven't arrived yet. Their fetch carries on, and a page still waiting shows its own loading line. */
export const LOADING_SCREEN_LIMIT_SECONDS = 4;

/** Seconds for the loading screen to fade out (none with reduced motion). */
export const LOADING_SCREEN_FADE_SECONDS = 0.3;

/** The entry gate: on the scene site, once the loading screen would lift, its bar gives way to an Enter button (with
 *  sound) and a quieter Enter without sound, so the press that starts sound is the visitor's own. Seconds for it to
 *  fade in over the bar (none with reduced motion). */
export const GATE_FADE_IN_SECONDS = 0.4;

/** Height of each gate button at least, in px: a comfortable touch target. */
export const GATE_TARGET_MIN_PX = 44;

/** Width of the Enter button, in px, never wider than the screen less a 16px gutter each side. */
export const GATE_ENTER_WIDTH_PX = 220;

/** Space between the two gate buttons, in px. */
export const GATE_GAP_PX = 8;

/** Gate text sizes, in px: the Enter label, its "with sound" line, and Enter without sound. */
export const GATE_ENTER_FONT_PX = 17;
export const GATE_ENTER_SUBLINE_FONT_PX = 12;
export const GATE_QUIET_FONT_PX = 14;

/** The speaker icon beside Enter, and the space between it and the label, in px. */
export const GATE_ICON_PX = 16;
export const GATE_ICON_GAP_PX = 10;

/** Gate button padding in px (vertical, horizontal; Enter without sound has no vertical padding), corner radius,
 *  border and the underline's offset under Enter without sound. */
export const GATE_ENTER_PADDING_PX: [vertical: number, horizontal: number] = [6, 16];
export const GATE_QUIET_PADDING_X_PX = 12;
export const GATE_RADIUS_PX = 6;
export const GATE_BORDER_PX = 1;
export const GATE_UNDERLINE_OFFSET_PX = 3;

/** The focus ring on a gate button: its width and its gap from the button, in px. */
export const GATE_FOCUS_RING_PX = 2;
export const GATE_FOCUS_RING_OFFSET_PX = 2;

/** The gate never comes closer than this to either side of the screen, in px. */
export const GATE_SIDE_GUTTER_PX = 16;

/** Scrolling under the gate gives the Enter button energy, from 0 at rest to 1 at most, which swells it to
 *  1 + `GATE_ENERGY_MAX_SCALE` and brightens its border (with reduced motion, only its border). Wheel and touch-drag
 *  scrolling add this much per px: one wheel notch (about 100 px) gives a just-visible swell, and a hard touchpad
 *  swipe or a long drag (500 px or more) fills it. */
export const GATE_ENERGY_PER_PX = 0.002;

/** Energy per scroll-key press or repeat: an arrow as much as one wheel notch; PageUp, PageDown, Home, End and Space
 *  more. */
export const GATE_ENERGY_PER_KEY = { arrow: 0.2, page: 0.5 } as const;

/** Energy halves every this many seconds, so the button eases back as soon as scrolling stops. */
export const GATE_ENERGY_HALF_LIFE_SECONDS = 0.25;

/** At or below this the energy is at rest: it drops to 0 and no frames run. */
export const GATE_ENERGY_REST = 0.001;

/** The Enter button's scale at full energy is 1 plus this. */
export const GATE_ENERGY_MAX_SCALE = 0.06;

/** The Enter button's border opacity at rest (as `index.html` draws it) and at full energy. */
export const GATE_ENERGY_BORDER_OPACITY: [rest: number, full: number] = [0.6, 1];

/** px per line for a wheel that scrolls by lines (Firefox's mouse wheel, 3 lines a notch). */
export const GATE_WHEEL_LINE_PX = 40;

/** A touch that moves this many px under the gate counts as a scroll attempt; less is a tap. */
export const GATE_TOUCH_SLOP_PX = 10;

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

/** Seconds for a zone backdrop's effects (mist, stars) to fade in once the loading screen has lifted. Its image layers
 *  are already showing under the screen by then. */
export const BACKDROP_FADE_IN_SECONDS = 1.2;

/** Pointer parallax: how far a backdrop image layer at depth 1 shifts against the pointer at the edge of the view, in
 *  px, sideways and vertically. A layer at depth d shifts d times as far. Off on touch screens. */
export const PARALLAX_MAX_X_PX = 10;
export const PARALLAX_MAX_Y_PX = 4;

/** How quickly the parallax eases toward the pointer, per second (as `CAMERA_DAMPING`). */
export const PARALLAX_DAMPING = 3;

/** The longest frame the parallax eases over, in seconds, so a long gap (a stalled frame) doesn't jump it. */
export const PARALLAX_MAX_STEP_SECONDS = 0.1;

/** Scale of a backdrop image layer at depth 1 at rest, so its edges never show as it shifts. A layer at depth d is
 *  scaled by 1 + d times the excess, and never less than its shifts need. */
export const LAYER_REST_SCALE = 1.04;

/** Walk-away push: as a zone's weight falls from 1 to 0, a layer at depth 1 moves down by up to this many px and
 *  scales up to `LAYER_PUSH_SCALE`; a layer at depth d by d times as much. */
export const LAYER_PUSH_PX = 30;
export const LAYER_PUSH_SCALE = 1.08;

/** Mist: the band's height as a fraction of the viewport height, its opacity, and the seconds of one seamless loop
 *  of its sideways drift. A soft haze along the horizon, hiding nothing. */
export const MIST_HEIGHT = 0.08;
export const MIST_OPACITY = 0.2;
export const MIST_LOOP_SECONDS = 90;

/** One tier of stars: how many, their size range in px, their opacity range, and whether they fade in and out. */
export interface StarTier {
  count: number;
  sizePx: [min: number, max: number];
  opacity: [min: number, max: number];
  twinkles: boolean;
}

/** Stars, an open sky before dawn: many tiny ones drawn once, fewer medium and bright ones that fade in and out
 *  between the ends of their opacity range. */
export const STAR_TIERS = {
  tiny: { count: 105, sizePx: [1, 1], opacity: [0.25, 0.6], twinkles: false },
  medium: { count: 28, sizePx: [1.5, 1.5], opacity: [0.4, 0.8], twinkles: true },
  bright: { count: 7, sizePx: [2, 2.5], opacity: [0.6, 1], twinkles: true },
} as const satisfies Record<string, StarTier>;
export const STAR_SEED = 2047;
/** Every star sits above this fraction of the sky (from the top of the view down to the horizon); the lowest part,
 *  just over the horizon, has none. */
export const STAR_SKY_FRACTION = 0.85;
/** How strongly stars bunch toward the top: a star's depth down the sky is a uniform draw raised to this power. */
export const STAR_TOP_BIAS = 1.8;
/** The dawn glow washes out stars around its centre column, where the landing text sits: none within this half-width
 *  of it, as a fraction of the view's width, then more and more over the next `STAR_GLOW_FADE_WIDTH`, until all are
 *  kept. Wide enough that no star sits behind the landing text on screens 1280px wide and up. */
export const STAR_GLOW_CLEAR_HALF_WIDTH = 0.17;
export const STAR_GLOW_FADE_WIDTH = 0.12;
/** Colours: most stars a pale blue-white; a few bright ones slightly warm or slightly blue. */
export const STAR_COLOR = '#e2eaff';
export const STAR_TINTS = ['#fff0d8', '#d4e0ff'] as const;
/** The share of bright stars given one of `STAR_TINTS`. */
export const STAR_TINT_SHARE = 0.45;
export const STAR_PERIOD_SECONDS: [min: number, max: number] = [2.5, 6];

/** Gain of a zone's ambient bed at full zone weight (0 to 1). Measured (EBU R128): the landing bed's file is
 *  -24.1 LUFS, so 0.25 plays it at about -36 LUFS, some 15 LU under the sweep's loudest moment (-21.3 LUFS). */
export const AMBIENT_GAIN = 0.25;

/** Time constant, in seconds, with which the ambient level follows the zone weight as the visitor scrolls. */
export const AMBIENT_FOLLOW_SECONDS = 0.25;

/** Time constant, in seconds, of the ambient fade as a full page opens or closes, and as mute is toggled. */
export const AMBIENT_FADE_SECONDS = 0.6;
