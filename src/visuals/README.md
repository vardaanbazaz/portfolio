# Visual modules

The scene has two replaceable slots:

- **Stop visuals**: one per stop, in `src/stops/<id>/`.
- **Environment**: everything between the stops, in `src/environment/<name>/`.

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

## Stop visuals (`src/stops/contract.ts`)

```ts
export type StopId = 'datavista' | 'publications' | 'experience';

export interface StopVisualProps {
  /** 0 when the camera is far from this stop, 1 at the stop's path point. */
  proximity: FrameValue<number>;
  /** True while this stop's page is opening, open, or closing. */
  active: boolean;
  /** True while the marker or the box is hovered or keyboard-focused. */
  hovered: boolean;
  quality: Quality;
}

export interface StopVisualModule {
  id: StopId;
  /** Renders in local space, centred on the origin, inside `bounds`. */
  Visual: ComponentType<StopVisualProps>;
  /** Half-extents of the local bounding box, used to frame the inspect pose. */
  bounds: [x: number, y: number, z: number];
  /** Local-space point where the marker button is pinned. */
  markerAnchor: [x: number, y: number, z: number];
  /** Optional: preload anything local (bundled) before first render. */
  preload?: () => Promise<void>;
}
```

Additional rules for stop visuals:

- Keep `bounds` in the stop's own `bounds.ts` as plain numbers, so scene geometry and tests can read them without loading the visual.
- Draw only inside `bounds`. The scene lifts the visual by `bounds[1]`, so its bottom face sits on the floor.
- Never attach to the scene itself (`attach="fog"` or `attach="background"`). The environment owns those.

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
- It must keep the camera's path and the stops clear. To do that it may import read-only geometry from `src/scene/cameraPath.ts` and `src/scene/layout.ts`. It may import no other scene code, and it never imports a stop visual.
