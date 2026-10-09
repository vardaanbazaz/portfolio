import { describe, expect, it } from 'vitest';
import { createStore, INITIAL_STATE, reduce, type AppEvent, type AppState } from '../../src/store';

const run = (events: AppEvent[], from: AppState = INITIAL_STATE) => events.reduce(reduce, from);
const boot = (route: AppState['route']): AppEvent => ({ type: 'boot', route });
const route = (r: AppState['route']): AppEvent => ({ type: 'route', route: r });

describe('boot', () => {
  it('goes straight to exploring on /', () => {
    expect(run([boot(null)])).toEqual(INITIAL_STATE);
    expect(INITIAL_STATE.phase).toBe('exploring');
  });

  it('opens the page straight away on a direct load, with no fly-in', () => {
    expect(run([boot('publications')])).toEqual({
      phase: 'pageOpen',
      stop: 'publications',
      route: 'publications',
      returnFocus: null,
    });
  });
});

describe('open and close', () => {
  const exploring = run([boot(null)]);

  it('runs the full cycle and returns focus to the stop that was open', () => {
    const states = [
      route('datavista'),
      { type: 'flyInDone' },
      route(null),
      { type: 'overlayClosed' },
      { type: 'flyOutDone' },
    ].reduce<AppState[]>((acc, e) => [...acc, reduce(acc[acc.length - 1], e as AppEvent)], [exploring]);
    expect(states.map((s) => s.phase)).toEqual([
      'exploring',
      'flyingIn',
      'pageOpen',
      'closing',
      'flyingOut',
      'exploring',
    ]);
    expect(states[1].stop).toBe('datavista');
    expect(states.at(-1)).toMatchObject({ stop: null, route: null, returnFocus: 'datavista' });
  });

  it('closes a direct-loaded page through the normal fly-out', () => {
    const s = run([route(null), { type: 'overlayClosed' }, { type: 'flyOutDone' }], run([boot('experience')]));
    expect(s).toMatchObject({ phase: 'exploring', stop: null, returnFocus: 'experience' });
  });
});

describe('route changes mid-flight', () => {
  const flyingIn = run([boot(null), route('publications')]);

  it('Back during a fly-in reverses into a fly-out', () => {
    expect(run([route(null)], flyingIn)).toMatchObject({ phase: 'flyingOut', stop: 'publications' });
  });

  it('Forward during that fly-out reverses back into a fly-in', () => {
    expect(run([route(null), route('publications')], flyingIn)).toMatchObject({
      phase: 'flyingIn',
      stop: 'publications',
    });
  });

  it('Forward while the overlay fades out reopens the page', () => {
    const closing = run([{ type: 'flyInDone' }, route(null)], flyingIn);
    expect(closing.phase).toBe('closing');
    expect(run([route('publications')], closing).phase).toBe('pageOpen');
  });

  it('a different stop waits until the camera is back on the path, then flies in', () => {
    const s = run([route(null), route('experience')], flyingIn);
    expect(s).toMatchObject({ phase: 'flyingOut', stop: 'publications', route: 'experience' });
    expect(run([{ type: 'flyOutDone' }], s)).toMatchObject({ phase: 'flyingIn', stop: 'experience' });
  });
});

describe('ignored events', () => {
  it('returns the same state object when nothing changes', () => {
    const s = run([boot(null)]);
    for (const e of [
      { type: 'flyInDone' },
      { type: 'overlayClosed' },
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
