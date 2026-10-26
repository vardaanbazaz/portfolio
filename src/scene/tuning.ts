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

/** A sustained average frame rate below this drops quality to 'low'; one at or above `PERF_RECOVER_FPS` (or the
 *  screen's refresh rate less 5, if that is lower) brings back the quality the visit started at. After
 *  `PERF_MAX_DROPS` drops quality stays low for the rest of the session, so it never flips back and forth for long. */
export const PERF_DECLINE_BELOW_FPS = 45;
export const PERF_RECOVER_FPS = 55;
export const PERF_MAX_DROPS = 3;

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

/** Crossing between two neighbouring zones that both have a backdrop: a dawn bloom, a radial light from warm white at
 *  its centre through soft amber to transparent, grows from the first world's light (the landing's dawn glow) and
 *  travels to the second's (the grove's sun), and the two pictures crossfade under it. Its opacity at its centre at
 *  the midpoint; 0 at both stops. */
export const BLOOM_PEAK = 0.6;

/** The bloom's radius as a share of the view's width: at the midpoint, and at either end. */
export const BLOOM_RADIUS = { mid: 0.9, end: 0.12 } as const;

/** The bloom's light from its centre (0) to its radius (1): where each stop is, its colour, and its alpha (times the
 *  bloom's opacity). Falling steeply, so the light at the view's edges stays at `BLOOM_EDGE_MAX` or less and the
 *  silhouettes stay visible through it. */
export const BLOOM_STOPS: readonly (readonly [at: number, rgb: string, alpha: number])[] = [
  [0, '255 246 228', 1],
  [0.1, '255 228 182', 0.62],
  [0.24, '255 208 142', 0.32],
  [0.45, '255 192 118', 0.14],
  [0.7, '255 184 108', 0.05],
  [1, '255 184 108', 0],
];

/** The most the bloom may add anywhere on the view's edges. */
export const BLOOM_EDGE_MAX = 0.2;

/** The bloom is drawn once into a square this many px wide and scaled to its radius, so a crossing only moves and
 *  fades it, never draws it again. */
export const BLOOM_DRAWN_PX = 256;

/** Half the width, as a share of the scroll between the two zones, of the window around the midpoint in which one
 *  picture crossfades into the other, under the bloom near its height. */
export const CROSSING_SWAP_HALF_WIDTH = 0.15;

/** A backdrop's effects (stars, mist, shimmer, motes) aren't drawn at all while its weight is below this. */
export const EFFECTS_MIN_WEIGHT = 0.05;

/** Seconds over which a world whose images arrived after the loading screen fades in, from how the path looked
 *  before it had a backdrop. */
export const BACKDROP_READY_FADE_SECONDS = 1.2;

/** A backdrop object's light: its glow image (warm gold, only on the pixels that glow: the stone's spiral) and a soft
 *  round bloom, added over the picture together, breathing between the ends of this opacity range over this many
 *  seconds. The spiral is painted bright already, so added light soon clips to a flat yellow-white: at 0.16, 1.5% of
 *  the spiral's pixels clip in both red and green (5.6% at 0.2, 24.5% at 0.3). With reduced motion it holds at
 *  `OBJECT_GLOW_STILL_OPACITY`. */
export const OBJECT_GLOW_PERIOD_SECONDS = 4;
export const OBJECT_GLOW_OPACITY: [min: number, max: number] = [0.06, 0.16];
export const OBJECT_GLOW_STILL_OPACITY = 0.1;
/** Hovering or focusing the object or its marker brightens its light to this, over `OBJECT_GLOW_HOVER_SECONDS`. */
export const OBJECT_GLOW_HOVER_OPACITY = 0.45;
export const OBJECT_GLOW_HOVER_SECONDS = 0.3;
/** The bloom's own opacity at its centre, under the breathing above. */
export const OBJECT_BLOOM_OPACITY = 0.5;

/** A marker pinned to a backdrop object sits this many px above the object's top. */
export const OBJECT_MARKER_GAP_PX = 10;

/** A marker never comes closer than this to either side of the view, in px. */
export const MARKER_SIDE_GUTTER_PX = 16;

/** A marker pinned to a backdrop object never comes higher than this, in px from the top of the view: below the menu
 *  bar (16 px from the top, its links 44 px tall) with 8 px to spare. */
export const MARKER_TOP_GUTTER_PX = 68;

/** The area that takes a press on a backdrop object is at least this many px each way: a comfortable touch target. */
export const OBJECT_HIT_MIN_PX = 44;

/** Light motes: soft warm points drifting slowly up and sideways in the light, brightest toward the sun's side. How
 *  many, their size range in px, their opacity range, the seconds of one drift, how far one rises and strays sideways
 *  over it in px, and their colour. Fixed by the seed. */
export const MOTE_COUNT = 40;
export const MOTE_SIZE_PX: [min: number, max: number] = [2, 6];
export const MOTE_OPACITY: [min: number, max: number] = [0.25, 0.85];
export const MOTE_PERIOD_SECONDS: [min: number, max: number] = [14, 28];
export const MOTE_RISE_PX: [min: number, max: number] = [40, 140];
export const MOTE_DRIFT_PX = 50;
export const MOTE_COLOR = '#ffe7b0';
export const MOTE_SEED = 1031;
/** Motes stay above this fraction of the view's height from the top (none in the foreground ferns and path), and
 *  bunch toward the sun's column: a mote's distance from it, as a fraction of the view's width, is a uniform draw
 *  raised to this power. */
export const MOTE_LOWEST = 0.82;
export const MOTE_SUN_BIAS = 1.6;

/** Light shimmer: the light falling from the upper left brightens and dims very slightly, an additive gradient whose
 *  opacity moves between the ends of this range over this many seconds. Barely noticeable. */
export const SHIMMER_OPACITY: [min: number, max: number] = [0, 0.1];
export const SHIMMER_PERIOD_SECONDS = 8;

/** Crossing into a world that arrives at dusk (the night city), a staged nightfall instead of the dawn bloom. Each
 *  stage is an opacity that rises over `rise` and, where it has one, falls over `fall`, both as shares u of the
 *  crossing, eased (smoothstep):
 *  - a sunset: the first world's light warms to orange (`warm`), then turns magenta-violet (`magenta`), as a slow
 *    colour grade laid over it;
 *  - dusk: a deep blue veil (`veil`) darkens it to a silhouette, and holds while the pictures swap under it;
 *  - the rain begins (`rain`, its near drops only: the far and close ones join once the crossing is over), over the
 *    veil;
 *  - the city's lights switch on in the dark (`lights`: an image of its bright pixels only, over the veil);
 *  - the veil falls and the full city comes in under its lights, which then fade out over the same lights.
 *  Neighbouring stages overlap, but at most three full-view layers change at once (a unit test samples this). */
export interface NightfallStage {
  rise: readonly [from: number, to: number];
  fall?: readonly [from: number, to: number];
}
export const NIGHTFALL = {
  warm: { rise: [0, 0.14], fall: [0.14, 0.3] },
  magenta: { rise: [0.12, 0.28], fall: [0.34, 0.46] },
  veil: { rise: [0.26, 0.44], fall: [0.66, 0.77] },
  rain: { rise: [0.55, 0.64] },
  lights: { rise: [0.58, 0.7], fall: [0.77, 0.81] },
} as const satisfies Record<string, NightfallStage>;

/** Both worlds hold still at rest until this share of the crossing (the lights have gone into the full city); then
 *  the city's life, parallax and pan start. */
export const NIGHTFALL_HELD_UNTIL = 0.82;

/** The sunset grade's two colour layers, each a gradient from the top of the view to the bottom, laid over the first
 *  world with normal blending, and the opacity each rises to. */
export const SUNSET_GRADE = {
  warm: { top: 'rgb(255 170 90)', bottom: 'rgb(255 112 48)', peak: 0.34 },
  magenta: { top: 'rgb(96 40 132)', bottom: 'rgb(196 64 128)', peak: 0.5 },
} as const;

/** The veil's colour, and its opacity at the hold (0 at both stops). */
export const DUSK_VEIL_COLOR = '#0a1430';
export const DUSK_VEIL_PEAK = 0.96;

/** Half the width of the window, as a share of the crossing, in which the pictures swap under the veil: inside its
 *  hold, so the swap only ever happens under the full veil. */
export const DUSK_SWAP_HALF_WIDTH = 0.04;

/** The rain bed fades in with the crossing over this share of it (from the rain's first streaks), as well as
 *  following the city's weight. */
export const NIGHTFALL_RAIN_SOUND: [from: number, to: number] = [0.55, 0.78];

/** The night city's sideways pan, where its picture is wider than the view (portrait phones): over this stretch of
 *  the path (t, from just after the crossing lets the city move, `NIGHTFALL_HELD_UNTIL`, to as far past the Projects
 *  stop) it brings each building to the middle of the view in turn, left to right, the middle one at the stop. Before
 *  it the first building is centred, after it the last. */
export const PROJECTS_PAN_T: [from: number, to: number] = [0.356, 0.424];

/** Rain: single drops drawn on one 2D canvas over the whole city (`environment/rain.ts`). At most `RAIN_MAX_DROPS`
 *  at the reference view, fewer with a smaller screen area (never more on a larger one), and only this share of them
 *  at each quality step. The canvas's pixel ratio is capped at `RAIN_PIXEL_RATIO_MAX`. */
export const RAIN_MAX_DROPS = 400;
export const RAIN_REFERENCE_VIEW = { width: 1920, height: 1080 } as const;
export const RAIN_QUALITY_SHARE = { high: 1, low: 0.5 } as const;
export const RAIN_PIXEL_RATIO_MAX = 1.5;

/** The rain's three depths. Per depth: its share of the drops; its speed range in px per second at a 1080 px tall
 *  view; how long its streak is in seconds of fall (the motion blur: length follows speed); its streak's width at the
 *  head in px; its alpha where the light behind it is brightest; and whether it is soft. Far drops are small, slow,
 *  faint and many; near ones longer, faster and sparse; a few close ones large, soft and quick. */
export const RAIN_DEPTHS = {
  far: { share: 0.7, speed: [700, 950], streakSeconds: 0.016, width: 0.9, alpha: 0.5, soft: false },
  near: { share: 0.27, speed: [1500, 1900], streakSeconds: 0.022, width: 1.3, alpha: 0.6, soft: false },
  close: { share: 0.03, speed: [2600, 3200], streakSeconds: 0.028, width: 3.2, alpha: 0.36, soft: true },
} as const;

/** The wind: the rain falls a few degrees off vertical (negative leans it to the left), a base the whole field shares
 *  that drifts by up to `driftDegrees` either way over two unrelated periods, and each drop up to `dropDegrees` off
 *  that of its own. */
export const RAIN_WIND = { baseDegrees: -5, driftDegrees: 3, dropDegrees: 1.5, periodsSeconds: [23, 41] } as const;

/** How a drop catches the city's light behind it (`environment/cityLight.ts`): the light's luma (0 to 255) from the
 *  dark sky's (no light) to the brightest signs' (full light); the share of its alpha a drop keeps with no light at
 *  all, nearly invisible; and how far its colour is mixed toward white. */
export const RAIN_LIGHT_LUMA: [dark: number, bright: number] = [34, 110];
export const RAIN_DARK_SHARE = 0.18;
export const RAIN_TINT_WHITE = 0.5;

/** Seconds for the rain's far and close drops to fade in once a crossing is over, and for all of it after the loading
 *  screen. */
export const RAIN_FADE_SECONDS = 1.2;

/** Aviation lights: red points blinking slowly on the cranes' tops and the tallest towers' spires. Each blinks once
 *  per period, lit for the share of it given, at its own phase. Their size in image px, and their colour. */
export const BEACON_PERIOD_SECONDS = 2.4;
export const BEACON_LIT_SHARE = 0.18;
export const BEACON_SIZE_PX = 9;
export const BEACON_COLOR = '#ff3b2e';
/** The lights' phases are spread over this share of a period, in their order, so no two blink together. */
export const BEACON_PHASE_SPREAD = 0.73;

/** Far windows that switch on or off now and then: each holds for its own period (between these, in seconds) and is
 *  lit for part of it. Warm, and as small as the painted windows around them. */
export const WINDOW_PERIOD_SECONDS: [min: number, max: number] = [14, 40];
export const WINDOW_COLOR = '#ffd89a';
/** A far window's opacity while lit. */
export const WINDOW_LIT_OPACITY = 0.9;
export const WINDOW_SEED = 911;

/** Car lights on the avenue far below, right of the violet tower: how many, and the seconds each takes along it. */
export const TRAFFIC_COUNT = 5;
export const TRAFFIC_SECONDS: [min: number, max: number] = [11, 19];
export const TRAFFIC_SEED = 433;
/** A car's lights: their size in image px, their colour coming toward the view (headlights) and going away (tail
 *  lights), their opacity, and the share of each run over which they fade in at its start and out at its end. */
export const CAR_SIZE_PX = { width: 3, height: 2 } as const;
export const CAR_COLORS = { toward: '#fff4dc', away: '#ff5040' } as const;
export const CAR_OPACITY = 0.9;
export const CAR_FADE_SHARE = 0.1;

/** The names on the buildings. How much the blade sign's blown-out cyan is darkened under DataVista's letters (an
 *  opacity of a dark layer fitted to the sign), measured for contrast. Nothing dark is drawn on the violet face. */
export const SIGN_BLADE_SHADE = 0.55;

/** The floodlight on KanbanLight's banner: light added over the painted banner, brightest at its top. Without it the
 *  banner's darkest pixels behind the letters are too dim for dark letters to read. Its alpha at the top and the
 *  bottom. */
export const SIGN_FLOOD: [top: number, bottom: number] = [0.45, 0.32];

/** NeuroInsight-AI's letters pulse gently between these opacities over this period; at rest, in the readings for
 *  contrast, they are at the dimmer end. */
export const PROJECTS_FACE_PULSE: [min: number, max: number] = [0.9, 1];
export const PROJECTS_FACE_PULSE_SECONDS = 5;

/** Once every this many seconds a soft wave of light sweeps up the violet face, taking `PROJECTS_FACE_WAVE_SECONDS`
 *  of it, at most this opacity. */
export const PROJECTS_FACE_CYCLE_SECONDS = 12;
export const PROJECTS_FACE_WAVE_SECONDS = 3;
export const PROJECTS_FACE_WAVE_OPACITY = 0.35;
/** The wave's band, as a share of the face's height. */
export const PROJECTS_FACE_WAVE_BAND = 0.3;

/** Unified API Ingester's banner swings on its cables, about the crane's hook, by at most this many degrees each way,
 *  over this period. */
export const BANNER_SWING_DEGREES = 0.4;
export const BANNER_SWING_SECONDS = 7;

/** Hovering or focusing a building, its sign or its marker lights the whole building: its light image (built from the
 *  painting, brighter than it at every pixel, its lit pixels most, with a soft glow round its silhouette) fades in to
 *  full over `BUILDING_LIGHT_IN_SECONDS` and out over `BUILDING_LIGHT_OUT_SECONDS`, by opacity alone. Its sign
 *  brightens with it. */
export const BUILDING_LIGHT_IN_SECONDS = 0.3;
export const BUILDING_LIGHT_OUT_SECONDS = 0.5;

/** The rain bed: a recording of rain that follows the night city's weight (and the crossing) as the landing's bed
 *  follows the landing's. It is the world's main sound, so it plays a little above the landing's bed (-36.2 LUFS):
 *  through its filters, its file measures -26.3 LUFS, so at this gain at full weight it plays at -34.1 LUFS. */
export const RAIN_BED_GAIN = 0.41;
/** Softened as if heard from indoors, as it plays: a high-pass and a low-pass, both 2nd order (Butterworth), wide
 *  enough that the patter and the taps on the glass come through on laptop speakers. In Hz. */
export const RAIN_BED_HIGHPASS_HZ = 120;
export const RAIN_BED_LOWPASS_HZ = 8000;
