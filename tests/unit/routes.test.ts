import { describe, expect, it } from 'vitest';
import { PAGE_IDS } from '../../src/pages/contract';
import {
  itemForState,
  itemState,
  PAGE_PATHS,
  pageForPath,
  panelForState,
  panelState,
  sectionForHash,
  sectionHash,
} from '../../src/routes';
import { SECTION_IDS } from '../../src/sections/contract';

describe('page routes', () => {
  it('maps every page to its path and back', () => {
    for (const id of PAGE_IDS) expect(pageForPath(PAGE_PATHS[id])).toBe(id);
  });

  it('uses the agreed URL shape', () => {
    expect(PAGE_PATHS).toEqual({
      about: '/about',
      datavista: '/projects/datavista',
      'neuroinsight-ai': '/projects/neuroinsight-ai',
      attrition: '/projects/attrition',
      kanbanlight: '/projects/kanbanlight',
      'unified-api-ingester': '/projects/unified-api-ingester',
      experience: '/experience',
      publications: '/publications',
      contact: '/contact',
    });
  });

  it('gives every page a distinct path', () => {
    expect(new Set(Object.values(PAGE_PATHS)).size).toBe(PAGE_IDS.length);
  });

  it('opens no page for /, /projects or unknown paths', () => {
    expect(pageForPath('/')).toBeNull();
    expect(pageForPath('/projects')).toBeNull();
    expect(pageForPath('/datavista')).toBeNull();
    expect(pageForPath('/publications/extra')).toBeNull();
  });

  it('ignores a trailing slash and letter case, like the router', () => {
    expect(pageForPath('/publications/')).toBe('publications');
    expect(pageForPath('/Projects/DataVista')).toBe('datavista');
  });
});

describe('items in history state', () => {
  it('round-trips an item of the page', () => {
    expect(itemForState('experience', itemState('drdo'))).toBe('drdo');
    expect(itemForState('publications', itemState('web-page-linker'))).toBe('web-page-linker');
  });

  it('carries no state for a marker without an item', () => {
    expect(itemState(undefined)).toBeNull();
  });

  it('ignores missing, malformed, unknown or another page’s items', () => {
    expect(itemForState('experience', null)).toBeNull();
    expect(itemForState('experience', 'drdo')).toBeNull();
    expect(itemForState('experience', { item: 42 })).toBeNull();
    expect(itemForState('experience', { item: 'toString' })).toBeNull();
    expect(itemForState('experience', { item: 'v-surveillance' })).toBeNull();
    expect(itemForState(null, { item: 'drdo' })).toBeNull();
  });
});

describe('panels in history state', () => {
  it('round-trips each panel item on /', () => {
    for (const item of ['drdo', 'agrybin', 'web-page-linker'] as const) expect(panelForState(null, panelState(item))).toBe(item);
  });

  it('ignores an item that opens its page, and missing, malformed or unknown state', () => {
    expect(panelForState(null, { panel: 'v-surveillance' })).toBeNull();
    expect(panelForState(null, null)).toBeNull();
    expect(panelForState(null, 'drdo')).toBeNull();
    expect(panelForState(null, { panel: 42 })).toBeNull();
    expect(panelForState(null, { panel: 'toString' })).toBeNull();
    expect(panelForState(null, itemState('drdo'))).toBeNull();
  });

  it('ignores a panel on a page’s entry', () => {
    expect(panelForState('experience', panelState('drdo'))).toBeNull();
  });
});

describe('section hashes', () => {
  it('maps every section to its hash and back', () => {
    for (const id of SECTION_IDS) expect(sectionForHash(sectionHash(id))).toBe(id);
    expect(sectionHash('projects')).toBe('#projects');
  });

  it('ignores an empty or unknown hash', () => {
    expect(sectionForHash('')).toBeNull();
    expect(sectionForHash('#')).toBeNull();
    expect(sectionForHash('#datavista')).toBeNull();
  });
});
