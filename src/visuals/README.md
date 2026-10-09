# Visual modules

The scene has two replaceable slots:

- **Section visuals**: one per section, in `src/sections/<id>/`. A section can hold several markers, each opening its own page (Projects has one per project).
- **Environment**: everything between the sections, in `src/environment/<name>/`.

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

/** One clickable object in a section. Each marker opens its own page. */
export interface SectionMarker {
  page: PageId;
  /** The part of the visual this marker belongs to: its button is pinned above it,
   *  the inspect pose frames it, and a click on the visual nearest to it opens `page`. */
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
  /** The page of this section that is opening, open or closing; null otherwise. */
  active: PageId | null;
  /** The page whose marker or part of the visual is hovered or keyboard-focused; null otherwise. */
  hovered: PageId | null;
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
- Draw each marker's part inside its `box`, and highlight it when `hovered` or `active` names its page.
- Never attach to the scene itself (`attach="fog"` or `attach="background"`). The environment owns those.
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
  /** Renders in world space. Owns the scene background and fog. */
  World: ComponentType<EnvironmentProps>;
  /** Optional: preload anything local (bundled) before first render. */
  preload?: () => Promise<void>;
}
```

Additional rules for the environment:

- It is the only module that sets the scene background and fog.
- It must keep the camera's path and the sections clear. To do that it may import read-only geometry from `src/scene/cameraPath.ts` and `src/scene/layout.ts`. It may import no other scene code, and it never imports a section visual.
