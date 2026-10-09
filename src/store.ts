import { useSyncExternalStore } from 'react';
import { ITEM_PAGE, type ItemId, type PageId, type PanelItemId } from './pages/contract';
import type { MarkerTarget } from './sections/contract';

/**
 * exploring ⇄ flyingIn → open → closing → flyingOut → exploring
 * The page or panel fades in once the camera arrives (`open`) and fades out before it leaves (`closing`).
 */
export type Phase = 'exploring' | 'flyingIn' | 'open' | 'closing' | 'flyingOut';

export interface AppState {
  phase: Phase;
  /** Page the camera is flying to, showing, or leaving; for a panel, the page its item belongs to. Null while exploring. */
  page: PageId | null;
  /** Item of `page` whose marker opened it: the camera frames its box (and a page scrolls to it). Null for the whole page. */
  item: ItemId | null;
  /** The target shows as `item`'s panel in the scene, not as `page`. */
  panel: boolean;
  /** Page the URL points at. The URL is the source of truth; the camera follows it. */
  route: PageId | null;
  /** Item the history entry carries with `route`. The path stays the page's own, so it lives in history state. */
  routeItem: ItemId | null;
  /** Panel the history entry carries on `/`. The URL doesn't change for a panel, so it lives in history state. */
  routePanel: PanelItemId | null;
  /** Marker that gets focus back once the camera has returned to the path. */
  returnFocus: MarkerTarget | null;
  /** The opaque page has fully faded in, so the canvas is hidden. Only ever true while a page (not a panel) is `open`. */
  sceneHidden: boolean;
}

export type AppEvent =
  /** First load. A page URL opens its page straight away; `/` goes straight to exploring. */
  | { type: 'boot'; route: PageId | null }
  /** The URL or its history state changed (marker click, close, menu, Back or Forward).
   *  `item` and `panel` come from the entry's history state; `panel` only ever comes with no route. */
  | { type: 'route'; route: PageId | null; item?: ItemId | null; panel?: PanelItemId | null }
  | { type: 'flyInDone' }
  /** The page or panel finished fading in. */
  | { type: 'shown' }
  /** The page or panel finished fading out. */
  | { type: 'hidden' }
  | { type: 'flyOutDone' };

export const INITIAL_STATE: AppState = {
  phase: 'exploring',
  page: null,
  item: null,
  panel: false,
  route: null,
  routeItem: null,
  routePanel: null,
  returnFocus: null,
  sceneHidden: false,
};

type Target = Pick<AppState, 'page' | 'item' | 'panel'>;

/** What the route asks the camera to show, or null for the path. */
function routeTarget({ route, routeItem, routePanel }: AppState): Target | null {
  if (route) return { page: route, item: routeItem, panel: false };
  if (routePanel) return { page: ITEM_PAGE[routePanel], item: routePanel, panel: true };
  return null;
}

/** Whether the route asks for what the camera is already showing. A page counts by its page alone;
 *  a panel by its item. */
function showsRoute(state: AppState): boolean {
  const target = routeTarget(state);
  if (!target || target.panel !== state.panel) return false;
  return target.panel ? target.item === state.item : target.page === state.page;
}

/** Pure transition function. Returns the same object when nothing changes. */
export function reduce(state: AppState, event: AppEvent): AppState {
  switch (event.type) {
    case 'boot':
      return event.route
        ? // Direct load: the page is shown at once, with no fly-in or fade.
          { ...INITIAL_STATE, phase: 'open', page: event.route, route: event.route, sceneHidden: true }
        : INITIAL_STATE;

    case 'route': {
      const { route } = event;
      const routePanel = route ? null : (event.panel ?? null);
      // Only the page counts: a reload keeps the entry's history state, so its first route event can name an item
      // the booted page doesn't have, and that must not close the page.
      if (route === state.route && routePanel === state.routePanel) return state;
      const routeItem = route ? (event.item ?? null) : null;
      const next = { ...state, route, routeItem, routePanel };
      const target = routeTarget(next);
      const same = showsRoute(next);
      switch (state.phase) {
        case 'exploring':
          return target ? { ...next, ...target, phase: 'flyingIn' } : next;
        // Leaving mid-way reverses; a different page or panel waits until the camera is back on the path.
        case 'flyingIn':
          return same ? next : { ...next, phase: 'flyingOut' };
        case 'open':
          return same ? next : { ...next, phase: 'closing', sceneHidden: false };
        case 'closing':
          return same ? { ...next, phase: 'open' } : next;
        case 'flyingOut':
          return same ? { ...next, phase: 'flyingIn' } : next;
      }
      return next;
    }

    case 'flyInDone':
      return state.phase === 'flyingIn' ? { ...state, phase: 'open' } : state;

    case 'shown':
      // A panel is translucent: the scene stays visible behind it.
      return state.phase === 'open' && !state.panel && !state.sceneHidden ? { ...state, sceneHidden: true } : state;

    case 'hidden':
      return state.phase === 'closing' ? { ...state, phase: 'flyingOut' } : state;

    case 'flyOutDone': {
      if (state.phase !== 'flyingOut') return state;
      const target = routeTarget(state);
      return target
        ? { ...state, ...target, phase: 'flyingIn' }
        : {
            ...state,
            phase: 'exploring',
            page: null,
            item: null,
            panel: false,
            returnFocus: state.page ? { page: state.page, item: state.item ?? undefined } : null,
          };
    }
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
