import { useSyncExternalStore } from 'react';
import type { PageId } from './pages/contract';

/**
 * exploring ⇄ flyingIn → pageOpen → closing → flyingOut → exploring
 * The page fades in once the camera arrives (`pageOpen`) and fades out before it leaves (`closing`).
 */
export type Phase = 'exploring' | 'flyingIn' | 'pageOpen' | 'closing' | 'flyingOut';

export interface AppState {
  phase: Phase;
  /** Page the camera is flying to, showing, or leaving. Null while exploring. */
  page: PageId | null;
  /** Page the URL points at. The URL is the source of truth; the camera follows it. */
  route: PageId | null;
  /** Page whose marker gets focus back once the camera has returned to the path. */
  returnFocus: PageId | null;
  /** The opaque page has fully faded in, so the canvas is hidden. Only ever true while `pageOpen`. */
  sceneHidden: boolean;
}

export type AppEvent =
  /** First load. A page URL opens its page straight away; `/` goes straight to exploring. */
  | { type: 'boot'; route: PageId | null }
  /** The URL changed (marker click, close, menu, Back or Forward). */
  | { type: 'route'; route: PageId | null }
  | { type: 'flyInDone' }
  /** The page finished fading in. */
  | { type: 'pageShown' }
  /** The page finished fading out. */
  | { type: 'pageHidden' }
  | { type: 'flyOutDone' };

export const INITIAL_STATE: AppState = { phase: 'exploring', page: null, route: null, returnFocus: null, sceneHidden: false };

/** Pure transition function. Returns the same object when nothing changes. */
export function reduce(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case 'boot':
      return event.route
        ? // Direct load: the page is shown at once, with no fly-in or fade.
          { phase: 'pageOpen', page: event.route, route: event.route, returnFocus: null, sceneHidden: true }
        : INITIAL_STATE;

    case 'route': {
      const { route } = event;
      if (route === state.route) return state;
      const next = { ...state, route };
      switch (state.phase) {
        case 'exploring':
          return route ? { ...next, phase: 'flyingIn', page: route } : next;
        // Leaving the page mid-way reverses; a different page waits until the camera is back on the path.
        case 'flyingIn':
          return route === state.page ? next : { ...next, phase: 'flyingOut' };
        case 'pageOpen':
          return route === state.page ? next : { ...next, phase: 'closing', sceneHidden: false };
        case 'closing':
          return route === state.page ? { ...next, phase: 'pageOpen' } : next;
        case 'flyingOut':
          return route === state.page ? { ...next, phase: 'flyingIn' } : next;
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
        ? { ...state, phase: 'flyingIn', page: state.route }
        : { ...state, phase: 'exploring', page: null, returnFocus: state.page };
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
