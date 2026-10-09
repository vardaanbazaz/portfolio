# Visual modules

The scene has three replaceable slots:

- **Section visuals**: one per section, in `src/sections/<id>/`. A section can hold several markers. A marker opens a whole page (Projects has one per project) or one item within a page (Experience has one per role, Publications one per paper). A short item opens as a panel beside its box in the scene; a long write-up opens its page scrolled to it.
- **Environment**: everything between the sections, in `src/environment/<name>/`. Its sky, fog, ground and lights blend between per-zone presets as the camera moves.
- **Zone visuals**: optional extras for one zone (ground detail, particles and so on), in `src/environment/zone-visuals/<id>/`. They fade in and out with the camera's distance from the zone.

Camera, routing and sound code import only each slot's contract (`contract.ts`) and registry (`registry.ts`). They never import a module's internals. To replace a visual, write a new module that satisfies the contract and point the registry at it.

## Shared types (`src/visuals/shared.ts`)

```ts
/** A value the scene updates every frame without re-rendering React.
 *  Read `.current` inside `useFrame`; never copy it into React state. */
export type FrameValue<T> = { readonly current: T };

/** 'low' on narrow viewports or after a sustained frame-rate drop. */
export type Quality = 'low' | 'high';
```

## Rules for every module

1. Never read or move the camera.
2. Don't import the router, sound or store. Behaviour comes only through props.
3. Don't add global listeners or touch the DOM. Any `useFrame` work is local animation only.
4. Don't fetch anything over the network. Bundle (import) every asset; never load one from a URL.
5. Clean up whatever you create. R3F disposes geometries and materials declared in JSX; anything created by hand must be disposed on unmount.
6. Honour `quality`. A `'low'` render must be visibly cheaper: fewer objects, lower detail.
7. Read per-frame values (`FrameValue`) inside `useFrame`. Props that change only occasionally (`active`, `hovered`, `quality`) arrive as ordinary props.

## Section visuals (`src/sections/contract.ts`)

```ts
export type SectionId = 'about' | 'projects' | 'experience' | 'publications' | 'contact';

export interface LocalBox {
  centre: [x: number, y: number, z: number];
  half: [x: number, y: number, z: number];
}

/** What a marker opens: a page, or one item within a page (its panel, or the page scrolled to it; see `PANEL_ITEMS`). */
export interface MarkerTarget {
  page: PageId;
  /** An item of `page` (see `PAGE_ITEMS` in `src/pages/contract.ts`). Absent: the marker opens the whole page. */
  item?: ItemId;
}

/** Identifies a marker: its item, or its page when it has no item. */
export type MarkerKey = PageId | ItemId;
export const markerKey = ({ page, item }: MarkerTarget): MarkerKey => item ?? page;

/** One clickable object in a section. A page without items has one marker; a page with items has one per item. */
export interface SectionMarker extends MarkerTarget {
  /** The part of the visual this marker belongs to: its button is pinned above it,
   *  the inspect pose frames it, and a click on the visual nearest to it opens its target. */
  box: LocalBox;
}

export interface SectionLayout {
  /** Half-extents of the whole visual's local bounding box, centred on the origin. */
  bounds: [x: number, y: number, z: number];
  /** At least one. Each box lies inside `bounds`. */
  markers: readonly SectionMarker[];
}

export interface SectionVisualProps {
  /** 0 when the camera is far from this section, 1 at the section's path point. */
  proximity: FrameValue<number>;
  /** The marker of this section whose page or panel is opening, open or closing; null otherwise
   *  (also null when the page was opened without an item, by its URL, and has several markers). */
  active: MarkerKey | null;
  /** The marker whose button or part of the visual is hovered or keyboard-focused; null otherwise. */
  hovered: MarkerKey | null;
  quality: Quality;
}

export interface SectionVisualModule {
  id: SectionId;
  /** Renders in local space, centred on the origin, inside `layout.bounds`. */
  Visual: ComponentType<SectionVisualProps>;
  layout: SectionLayout;
  /** Optional: preload anything local (bundled) before first render. */
  preload?: () => Promise<void>;
}
```

Additional rules for section visuals:

- Keep the layout in the section's own `layout.ts` as plain data, so scene geometry and tests can read it without loading the visual.
- Draw only inside `bounds`. The scene lifts the visual by `bounds[1]`, so its bottom face sits on the floor. Each marker box stands on the floor too.
- Draw each marker's part inside its `box`, and highlight it when `hovered` or `active` equals its `markerKey`.
- An item marker's label comes from `ITEM_LABELS` in `src/content/scene.ts`; a page marker's from `PAGE_LABELS`. Give each item its own box. An item has no URL of its own. What its marker opens depends on `PANEL_ITEMS` in `src/pages/contract.ts`:
  - **Panel items** (short: DRDO, AgryBin, Web Page Linker). The camera frames the item's box in one half of the screen (the left half, or the top half below 768 px wide) and a translucent HTML panel opens in the other half, joined to the box by a thin leader line. The scene keeps drawing around it. The URL stays as it is; the panel lives in history state, so Back closes it, as do Close, Escape and a press outside it. Its content comes from the page's content file.
  - **Page items** (long write-ups: V-Surveillance). The marker opens the page at the page's path with the item in history state, the page scrolls to the item's heading (`itemHeadingId`) and focuses it, and the camera frames that item's box.
  - The Experience page still shows both roles, for direct links and the HTML fallback. The Publications page shows only the V-Surveillance write-up: Web Page Linker lives only in its panel, so the HTML fallback must list it itself. Opened by its URL alone, a page with items frames the whole section.
- A panel's box is framed in half the screen, so it is drawn smaller than a page's. Highlight it on `active` as for a page; the leader line is the scene's, not the visual's.
- `rowLayout` (`src/sections/row.ts`) lays out a straight row of boxes standing on the floor, one marker each. Give neighbouring boxes different heights so their marker buttons don't overlap on narrow screens.
- Never attach to the scene itself (`attach="fog"` or `attach="background"`), and add no lights. The environment owns those.
- Don't hide yourself by distance. The scene stops drawing a section once it is beyond the cull distance (`CULL_DISTANCE` in `src/scene/tuning.ts`).

The scene owns world placement (`src/scene/layout.ts`); the visual only owns its local space.

## Environment (`src/environment/contract.ts`)

```ts
export interface EnvironmentProps {
  /** The camera's eased path position t, 0..1. */
  pathT: FrameValue<number>;
  quality: Quality;
}

export interface EnvironmentModule {
  /** Renders in world space. Owns the scene background, fog, ground and lights,
   *  blended between the zone presets (`blendZones` in `zones.ts`) by path position. */
  World: ComponentType<EnvironmentProps>;
  /** Optional: preload anything local (bundled) before first render. */
  preload?: () => Promise<void>;
}
```

Additional rules for the environment:

- It is the only module that sets the scene background, fog and lights.
- It must keep the camera's path and the sections clear. To do that it may import read-only geometry from `src/scene/cameraPath.ts` and `src/scene/layout.ts`. It may import no other scene code, and it never imports a section visual.
- Take every colour, fog distance and light strength from `blendZones` (`src/environment/zones.ts`) each frame; don't hard-code them. Call it inside `useFrame` with one state object made by `createZoneState`, and copy the values onto existing objects, so a frame allocates nothing.

### Zones (`src/environment/zones.ts`)

The path has six zones: `landing` at t = 0, then each section at its `SECTION_T`. Each has a `ZonePreset` in `ZONE_PRESETS`:

```ts
export type ZoneId = 'landing' | SectionId;

export interface ZonePreset {
  sky: { top: string; horizon: string };
  /** Linear fog, in world units from the camera, at quality 'high'. */
  fog: { color: string; near: number; far: number };
  ground: string;
  ambient: { color: string; intensity: number };
  sun: { color: string; intensity: number };
}
```

- At a zone's own point its preset applies fully. Between two neighbouring zones the environment mixes the two, eased so each preset holds near its point. Before the landing point and past Contact's, the end preset holds.
- Quality `'low'` uses the same presets with the fog's near and far multiplied by `LOW_FOG_SCALE`.
- A preset's fog `far` must be within `CULL_DISTANCE` (`src/scene/tuning.ts`) at both qualities, so fog hides a section before the scene stops drawing it. A unit test checks this.
- Keep the fog colour close to the sky's horizon colour; fully fogged ground meets the sky there.

## Zone visuals (`src/environment/contract.ts`)

```ts
export interface ZoneVisualProps {
  /** 1 at the zone's own path point, easing to 0 at its neighbours' points (`zoneWeight`).
   *  Updated every frame; read `.current` inside useFrame. */
  presence: FrameValue<number>;
  quality: Quality;
}

export interface ZoneVisualModule {
  id: ZoneId;
  /** Renders in world space. Not drawn while `presence` is 0. */
  Visual: ComponentType<ZoneVisualProps>;
  /** Optional: preload anything local (bundled) before first render. */
  preload?: () => Promise<void>;
}
```

Register each one in `zoneVisuals` in `src/environment/registry.ts`, at most one per zone. A zone without one shows only the blended environment.

Additional rules for zone visuals:

- Fade with `presence`: fully shown at 1, gone at 0. Its neighbours' visuals are fading the other way over the same stretch, so a crossfade needs no extra code.
- Stay near your zone's stretch of path, between its neighbours' points (`ZONE_T`). The same import limits as the environment apply: read-only geometry from `cameraPath.ts` and `layout.ts`, nothing else from the scene.
- Keep the camera's path and the sections clear.
- Never attach to the scene itself and add no lights. The environment owns those.
