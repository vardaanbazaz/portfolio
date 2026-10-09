import { describe, expect, it } from 'vitest';
import { PAGE_IDS } from '../../src/pages/contract';
import { PAGE_PATHS, pageForPath, sectionForHash, sectionHash } from '../../src/routes';
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
