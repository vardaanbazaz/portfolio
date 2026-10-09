import { describe, expect, it } from 'vitest';
import { createStore, INITIAL_STATE, reduce, type AppEvent, type AppState } from '../../src/store';

const run = (events: AppEvent[], from: AppState = INITIAL_STATE) => events.reduce(reduce, from);
const boot = (route: AppState['route']): AppEvent => ({ type: 'boot', route });
const route = (r: AppState['route'], item?: AppState['item']): AppEvent => ({ type: 'route', route: r, item });
const panel = (p: AppState['routePanel']): AppEvent => ({ type: 'route', route: null, panel: p });

describe('boot', () => {
  it('goes straight to exploring on /', () => {
    expect(run([boot(null)])).toEqual(INITIAL_STATE);
    expect(INITIAL_STATE.phase).toBe('exploring');
  });

  it('opens the page straight away on a direct load, with no fly-in or fade, and the scene hidden', () => {
    expect(run([boot('publications')])).toEqual({
      phase: 'open',
      page: 'publications',
      item: null,
      panel: false,
      route: 'publications',
      routeItem: null,
      routePanel: null,
      returnFocus: null,
      sceneHidden: true,
    });
  });

  it('keeps the page open when a reload brings back an item in history state', () => {
    const booted = run([boot('experience')]);
    expect(reduce(booted, route('experience', 'drdo'))).toBe(booted);
  });
});

describe('items', () => {
  const exploring = run([boot(null)]);

  it('flies in to the item, and returns focus to its marker', () => {
    const open = run([route('experience', 'agrybin'), { type: 'flyInDone' }], exploring);
    expect(open).toMatchObject({ phase: 'open', page: 'experience', item: 'agrybin', routeItem: 'agrybin' });
    const back = run([route(null), { type: 'hidden' }, { type: 'flyOutDone' }], open);
    expect(back).toMatchObject({ phase: 'exploring', page: null, item: null, routeItem: null });
    expect(back.returnFocus).toEqual({ page: 'experience', item: 'agrybin' });
  });

  it('keeps the next route’s item while the camera returns to the path, then flies in to it', () => {
    const s = run([route('publications', 'web-page-linker'), route(null), route('experience', 'drdo')], exploring);
    expect(s).toMatchObject({ phase: 'flyingOut', page: 'publications', item: 'web-page-linker', routeItem: 'drdo' });
    expect(run([{ type: 'flyOutDone' }], s)).toMatchObject({ phase: 'flyingIn', page: 'experience', item: 'drdo' });
  });

  it('keeps the item when Back during a fly-in reverses it', () => {
    const s = run([route('experience', 'drdo'), route(null)], exploring);
    expect(s).toMatchObject({ phase: 'flyingOut', page: 'experience', item: 'drdo' });
  });

  it('opens the whole page when the entry carries no item', () => {
    expect(run([route('experience')], exploring)).toMatchObject({ phase: 'flyingIn', item: null });
  });
});

describe('panels', () => {
  const exploring = run([boot(null)]);

  it('flies in to the item’s box and opens its panel, with the URL left on /', () => {
    const flying = run([panel('drdo')], exploring);
    expect(flying).toMatchObject({ phase: 'flyingIn', page: 'experience', item: 'drdo', panel: true, route: null });
    expect(run([{ type: 'flyInDone' }], flying)).toMatchObject({ phase: 'open', panel: true });
  });

  it('runs the full cycle, keeps the scene showing throughout, and returns focus to the item’s marker', () => {
    const events: AppEvent[] = [
      panel('web-page-linker'),
      { type: 'flyInDone' },
      { type: 'shown' },
      panel(null),
      { type: 'hidden' },
      { type: 'flyOutDone' },
    ];
    const states = events.reduce<AppState[]>((acc, e) => [...acc, reduce(acc[acc.length - 1], e)], [exploring]);
    expect(states.map((s) => s.phase)).toEqual(['exploring', 'flyingIn', 'open', 'open', 'closing', 'flyingOut', 'exploring']);
    expect(states.every((s) => !s.sceneHidden)).toBe(true);
    expect(states.at(-1)).toMatchObject({
      page: null,
      item: null,
      panel: false,
      routePanel: null,
      returnFocus: { page: 'publications', item: 'web-page-linker' },
    });
  });

  it('Back during the fly-in reverses it, and Forward reverses again', () => {
    const back = run([panel('agrybin'), panel(null)], exploring);
    expect(back).toMatchObject({ phase: 'flyingOut', item: 'agrybin', panel: true });
    expect(run([panel('agrybin')], back)).toMatchObject({ phase: 'flyingIn', item: 'agrybin', panel: true });
  });

  it('a different panel, or a page, waits until the camera is back on the path', () => {
    const open = run([panel('drdo'), { type: 'flyInDone' }], exploring);
    const next = run([panel('agrybin')], open);
    expect(next).toMatchObject({ phase: 'closing', item: 'drdo', routePanel: 'agrybin' });
    expect(run([{ type: 'hidden' }, { type: 'flyOutDone' }], next)).toMatchObject({
      phase: 'flyingIn',
      item: 'agrybin',
      panel: true,
    });
    const toPage = run([route('publications', 'v-surveillance'), { type: 'hidden' }, { type: 'flyOutDone' }], open);
    expect(toPage).toMatchObject({ phase: 'flyingIn', page: 'publications', item: 'v-surveillance', panel: false });
  });

  it('a panel never comes with a page route', () => {
    expect(reduce(exploring, { type: 'route', route: 'experience', panel: 'drdo' })).toMatchObject({
      routePanel: null,
      panel: false,
    });
  });
});

describe('open and close', () => {
  const exploring = run([boot(null)]);

  it('runs the full cycle and returns focus to the marker of the page that was open', () => {
    const states = [
      route('datavista'),
      { type: 'flyInDone' },
      route(null),
      { type: 'hidden' },
      { type: 'flyOutDone' },
    ].reduce<AppState[]>((acc, e) => [...acc, reduce(acc[acc.length - 1], e as AppEvent)], [exploring]);
    expect(states.map((s) => s.phase)).toEqual([
      'exploring',
      'flyingIn',
      'open',
      'closing',
      'flyingOut',
      'exploring',
    ]);
    expect(states[1].page).toBe('datavista');
    expect(states.at(-1)).toMatchObject({ page: null, route: null, returnFocus: { page: 'datavista' } });
  });

  it('closes a direct-loaded page through the normal fly-out', () => {
    const s = run([route(null), { type: 'hidden' }, { type: 'flyOutDone' }], run([boot('experience')]));
    // No item: focus goes to the page's first marker (see returnMarker).
    expect(s).toMatchObject({ phase: 'exploring', page: null, returnFocus: { page: 'experience' } });
  });
});

describe('route changes mid-flight', () => {
  const flyingIn = run([boot(null), route('publications')]);

  it('Back during a fly-in reverses into a fly-out', () => {
    expect(run([route(null)], flyingIn)).toMatchObject({ phase: 'flyingOut', page: 'publications' });
  });

  it('Forward during that fly-out reverses back into a fly-in', () => {
    expect(run([route(null), route('publications')], flyingIn)).toMatchObject({
      phase: 'flyingIn',
      page: 'publications',
    });
  });

  it('Forward while the page fades out reopens it', () => {
    const closing = run([{ type: 'flyInDone' }, route(null)], flyingIn);
    expect(closing.phase).toBe('closing');
    expect(run([route('publications')], closing).phase).toBe('open');
  });

  it('a different page waits until the camera is back on the path, then flies in', () => {
    const s = run([route(null), route('experience')], flyingIn);
    expect(s).toMatchObject({ phase: 'flyingOut', page: 'publications', route: 'experience' });
    expect(run([{ type: 'flyOutDone' }], s)).toMatchObject({ phase: 'flyingIn', page: 'experience' });
  });
});

describe('scene hiding', () => {
  const pageOpen = run([boot(null), route('datavista'), { type: 'flyInDone' }]);

  it('keeps the scene visible while the page fades in, and hides it once the fade is done', () => {
    expect(pageOpen.sceneHidden).toBe(false);
    expect(run([{ type: 'shown' }], pageOpen).sceneHidden).toBe(true);
  });

  it('shows the scene again as soon as the page starts fading out', () => {
    const closing = run([{ type: 'shown' }, route(null)], pageOpen);
    expect(closing).toMatchObject({ phase: 'closing', sceneHidden: false });
  });

  it('shows the scene when a direct-loaded page closes', () => {
    expect(run([route(null)], run([boot('experience')]))).toMatchObject({ phase: 'closing', sceneHidden: false });
  });

  it('waits for a fresh fade-in when Forward reopens a page mid-fade-out', () => {
    const reopened = run([{ type: 'shown' }, route(null), route('datavista')], pageOpen);
    expect(reopened).toMatchObject({ phase: 'open', sceneHidden: false });
    expect(run([{ type: 'shown' }], reopened).sceneHidden).toBe(true);
  });

  it('ignores a late fade-in event once the page is closing', () => {
    const closing = run([route(null)], pageOpen);
    expect(reduce(closing, { type: 'shown' })).toBe(closing);
  });
});

describe('ignored events', () => {
  it('returns the same state object when nothing changes', () => {
    const s = run([boot(null)]);
    for (const e of [
      { type: 'flyInDone' },
      { type: 'shown' },
      { type: 'hidden' },
      { type: 'flyOutDone' },
      route(null),
    ] as AppEvent[]) {
      expect(reduce(s, e)).toBe(s);
    }
  });

  it('ignores fly-done events from a stale tween', () => {
    const pageOpen = run([boot('datavista')]);
    expect(reduce(pageOpen, { type: 'flyInDone' })).toBe(pageOpen);
    expect(reduce(pageOpen, { type: 'flyOutDone' })).toBe(pageOpen);
  });
});

describe('createStore', () => {
  it('notifies only on real changes', () => {
    const store = createStore();
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.dispatch(boot(null));
    expect(calls).toBe(0);
    store.dispatch(route('experience'));
    expect(calls).toBe(1);
    expect(store.get().phase).toBe('flyingIn');
    off();
    store.dispatch(route(null));
    expect(calls).toBe(1);
  });
});
