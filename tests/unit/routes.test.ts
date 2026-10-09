import { describe, expect, it } from 'vitest';
import { STOP_PATHS, stopForPath } from '../../src/routes';
import { STOP_IDS } from '../../src/stops/contract';

describe('routes', () => {
  it('maps every stop to its path and back', () => {
    for (const id of STOP_IDS) expect(stopForPath(STOP_PATHS[id])).toBe(id);
  });

  it('uses the agreed URL shape', () => {
    expect(STOP_PATHS).toEqual({
      datavista: '/projects/datavista',
      publications: '/publications',
      experience: '/experience',
    });
  });

  it('gives every stop a distinct path', () => {
    expect(new Set(Object.values(STOP_PATHS)).size).toBe(STOP_IDS.length);
  });

  it('opens no page for / or unknown paths', () => {
    expect(stopForPath('/')).toBeNull();
    expect(stopForPath('/projects')).toBeNull();
    expect(stopForPath('/datavista')).toBeNull();
    expect(stopForPath('/publications/extra')).toBeNull();
  });

  it('ignores a trailing slash and letter case, like the router', () => {
    expect(stopForPath('/publications/')).toBe('publications');
    expect(stopForPath('/Projects/DataVista')).toBe('datavista');
  });
});
