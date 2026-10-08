/** A value the scene updates every frame without re-rendering React.
 *  Read `.current` inside `useFrame`; never copy it into React state. */
export type FrameValue<T> = { readonly current: T };

/** 'low' on narrow viewports or after a sustained frame-rate drop. */
export type Quality = 'low' | 'high';
