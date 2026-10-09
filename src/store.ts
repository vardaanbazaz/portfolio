import { useSyncExternalStore } from 'react';
import type { ItemId, PageId } from './pages/contract';
import type { MarkerTarget } from './sections/contract';

/**
 * exploring ⇄ flyingIn → pageOpen → closing → flyingOut → exploring
 * The page fades in once the camera arrives (`pageOpen`) and fades out before it leaves (`closing`).
 */
export type Phase = 'exploring' | 'flyingIn' | 'pageOpen' | 'closing' | 'flyingOut';

export interface AppState {
  phase: Phase;
  /** Page the camera is flying to, showing, or leaving. Null while exploring. */
  page: PageId | null;
  /** Item of `page` whose marker opened it: the camera frames its box and the page scrolls to it. Null for the whole page. */
  item: ItemId | null;
  /** Page the URL points at. The URL is the source of truth; the camera follows it. */
  route: PageId | null;
  /** Item the history entry carries with `route`. The path stays the page's own, so it lives in history state. */
  routeItem: ItemId | null;
  /** Marker that gets focus back once the camera has returned to the path. */
  returnFocus: MarkerTarget | null;
  /** The opaque page has fully faded in, so the canvas is hidden. Only ever true while `pageOpen`. */
  sceneHidden: boolean;
}

export type AppEvent =
  /** First load. A page URL opens its page straight away; `/` goes straight to exploring. */
  | { type: 'boot'; route: PageId | null }
  /** The URL changed (marker click, close, menu, Back or Forward). `item` comes from the entry's history state. */
  | { type: 'route'; route: PageId | null; item?: ItemId | null }
  | { type: 'flyInDone' }
  /** The page finished fading in. */
  | { type: 'pageShown' }
  /** The page finished fading out. */
  | { type: 'pageHidden' }
  | { type: 'flyOutDone' };

export const INITIAL_STATE: AppState = {
  phase: 'exploring',
  page: null,
  item: null,
  route: null,
  routeItem: null,
  returnFocus: null,
  sceneHidden: false,
};

/** Pure transition function. Returns the same object when nothing changes. */
export function reduce(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case 'boot':
      return event.route
        ? // Direct load: the page is shown at once, with no fly-in or fade.
          { ...INITIAL_STATE, phase: 'pageOpen', page: event.route, route: event.route, sceneHidden: true }
        : INITIAL_STATE;

    case 'route': {
      const { route } = event;
      // Only the page counts: a reload keeps the entry's history state, so its first route event can name an item
      // the booted page doesn't have, and that must not close the page.
      if (route === state.route) return state;
      const routeItem = route ? (event.item ?? null) : null;
      const next = { ...state, route, routeItem };
      switch (state.phase) {
        case 'exploring':
          return route ? { ...next, phase: 'flyingIn', page: route, item: routeItem } : next;
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
        ? { ...state, phase: 'flyingIn', page: state.route, item: state.routeItem }
        : {
            ...state,
            phase: 'exploring',
            page: null,
            item: null,
            returnFocus: state.page ? { page: state.page, item: state.item ?? undefined } : null,
          };
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
