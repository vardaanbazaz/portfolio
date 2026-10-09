import { useSyncExternalStore } from 'react';
import type { StopId } from './stops/contract';

/**
 * exploring ⇄ flyingIn → pageOpen → closing → flyingOut → exploring
 * The page fades in once the camera arrives (`pageOpen`) and fades out before it leaves (`closing`).
 */
export type Phase = 'exploring' | 'flyingIn' | 'pageOpen' | 'closing' | 'flyingOut';

export interface AppState {
  phase: Phase;
  /** Stop the camera is flying to, showing, or leaving. Null while exploring. */
  stop: StopId | null;
  /** Stop the URL points at. The URL is the source of truth; the camera follows it. */
  route: StopId | null;
  /** Stop whose marker gets focus back once the camera has returned to the path. */
  returnFocus: StopId | null;
  /** The opaque page has fully faded in, so the canvas is hidden. Only ever true while `pageOpen`. */
  sceneHidden: boolean;
}

export type AppEvent =
  /** First load. A stop URL opens its page straight away; `/` goes straight to exploring. */
  | { type: 'boot'; route: StopId | null }
  /** The URL changed (marker click, close, Back or Forward). */
  | { type: 'route'; route: StopId | null }
  | { type: 'flyInDone' }
  /** The page finished fading in. */
  | { type: 'pageShown' }
  /** The page finished fading out. */
  | { type: 'pageHidden' }
  | { type: 'flyOutDone' };

export const INITIAL_STATE: AppState = { phase: 'exploring', stop: null, route: null, returnFocus: null, sceneHidden: false };

/** Pure transition function. Returns the same object when nothing changes. */
export function reduce(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case 'boot':
      return event.route
        ? // Direct load: the page is shown at once, with no fly-in or fade.
          { phase: 'pageOpen', stop: event.route, route: event.route, returnFocus: null, sceneHidden: true }
        : INITIAL_STATE;

    case 'route': {
      const { route } = event;
      if (route === state.route) return state;
      const next = { ...state, route };
      switch (state.phase) {
        case 'exploring':
          return route ? { ...next, phase: 'flyingIn', stop: route } : next;
        // Leaving the stop mid-way reverses; a different stop waits until the camera is back on the path.
        case 'flyingIn':
          return route === state.stop ? next : { ...next, phase: 'flyingOut' };
        case 'pageOpen':
          return route === state.stop ? next : { ...next, phase: 'closing', sceneHidden: false };
        case 'closing':
          return route === state.stop ? { ...next, phase: 'pageOpen' } : next;
        case 'flyingOut':
          return route === state.stop ? { ...next, phase: 'flyingIn' } : next;
      }
      return next;
    }

    case 'flyInDone':
      return state.phase === 'flyingIn' ? { ...state, phase: 'pageOpen' } : state;

    case 'pageShown':
      return state.phase === 'pageOpen' && !state.sceneHidden ? { ...state, sceneHidden: true } : state;

    case 'pageHidden':
      return state.phase === 'closing' ? { ...state, phase: 'flyingOut' } : state;

    case 'flyOutDone':
      if (state.phase !== 'flyingOut') return state;
      return state.route
        ? { ...state, phase: 'flyingIn', stop: state.route }
        : { ...state, phase: 'exploring', stop: null, returnFocus: state.stop };
  }
}

export function createStore(initial: AppState = INITIAL_STATE) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    dispatch(event: AppEvent) {
      const next = reduce(state, event);
      if (next === state) return;
      state = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const appStore = createStore();

export function useAppState(): AppState {
  return useSyncExternalStore(appStore.subscribe, appStore.get);
}
