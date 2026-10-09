import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { content as experience } from '../../src/content/pages/experience';
import { content as publications } from '../../src/content/pages/publications';
import { ITEM_LABELS, markerLabel, PAGE_LABELS, SECTION_LINES, SECTION_NOTES, SECTION_TITLES } from '../../src/content/scene';
import { ITEM_PAGE, itemHeadingId, opensPanel, PAGE_IDS, PAGE_ITEMS, PANEL_ITEMS } from '../../src/pages/contract';
import PublicationsPage from '../../src/pages/PublicationsPage';
import { citationFor } from '../../src/panels/citationItem';
import { roleFor } from '../../src/panels/roleItem';
import { Vector3 } from 'three';
import { landingOpacity, pathPos, SECTION_T } from '../../src/scene/cameraPath';
import { sectionInRange } from '../../src/scene/culling';
import { nearestMarkerIndex, sectionLayout } from '../../src/scene/layout';
import { CULL_DISTANCE, LANDING_FADE_T } from '../../src/scene/tuning';
import { markerKey, SECTION_IDS, type SectionId } from '../../src/sections/contract';
import { MARKERS, markerAt, PAGE_SECTION, returnMarker, sectionLayouts } from '../../src/sections/layouts';

describe('section layouts', () => {
  it('gives a page without items one marker and a page with items one marker per item, in page order', () => {
    for (const page of PAGE_IDS) {
      const targets = MARKERS.filter((m) => m.marker.page === page).map(({ marker: { page, item } }) => ({ page, item }));
      const items = PAGE_ITEMS[page];
      expect(targets).toEqual(items ? items.map((item) => ({ page, item })) : [{ page, item: undefined }]);
    }
  });

  it('gives every marker a distinct key, and keeps each page in one section', () => {
    expect(new Set(MARKERS.map((m) => m.key)).size).toBe(MARKERS.length);
    for (const { section, marker } of MARKERS) expect(PAGE_SECTION[marker.page]).toBe(section);
    for (const { key, marker } of MARKERS) expect(markerAt(marker)?.key).toBe(key);
  });

  it('only gives a marker an item of its own page', () => {
    for (const { marker } of MARKERS) if (marker.item) expect(ITEM_PAGE[marker.item]).toBe(marker.page);
  });

  it('lays out the markers of each section in the agreed order', () => {
    const keys = (id: SectionId) => sectionLayouts[id].markers.map(markerKey);
    expect(keys('projects')).toEqual(['datavista', 'neuroinsight-ai', 'attrition', 'kanbanlight', 'unified-api-ingester']);
    // Most recent role first; Mahyco is a line on the page, not a box.
    expect(keys('experience')).toEqual(['drdo', 'agrybin']);
    expect(keys('publications')).toEqual(['v-surveillance', 'web-page-linker']);
    for (const id of ['about', 'contact'] as const) expect(keys(id)).toEqual([id]);
  });

  it('makes the Web Page Linker box clearly smaller than the V-Surveillance one', () => {
    const [writeUp, citation] = sectionLayouts.publications.markers.map((m) => m.box.half);
    for (let axis = 0; axis < 3; axis++) expect(citation[axis]).toBeLessThanOrEqual(writeUp[axis] * 0.6);
  });

  it('returns focus to the page’s own marker, else its first', () => {
    expect(returnMarker({ page: 'datavista' })).toBe('datavista');
    expect(returnMarker({ page: 'experience', item: 'agrybin' })).toBe('agrybin');
    expect(returnMarker({ page: 'experience' })).toBe('drdo');
    expect(returnMarker({ page: 'publications' })).toBe('v-surveillance');
  });

  it('keeps every marker box inside its section bounds and standing on the floor', () => {
    for (const id of SECTION_IDS) {
      const { bounds, markers } = sectionLayouts[id];
      for (const { box } of markers) {
        for (let axis = 0; axis < 3; axis++) {
          expect(Math.abs(box.centre[axis]) + box.half[axis]).toBeLessThanOrEqual(bounds[axis] + 1e-9);
        }
        expect(box.centre[1] - box.half[1]).toBeCloseTo(-bounds[1], 9);
      }
    }
  });

  it('keeps marker boxes in a section apart', () => {
    for (const id of SECTION_IDS) {
      const boxes = sectionLayouts[id].markers.map((m) => m.box);
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const gap = Math.abs(boxes[i].centre[0] - boxes[j].centre[0]) - boxes[i].half[0] - boxes[j].half[0];
          expect(gap).toBeGreaterThan(0);
        }
      }
    }
  });

  it('has a title, a one-liner slot and page labels for everything', () => {
    for (const id of SECTION_IDS) {
      expect(SECTION_TITLES[id]).toBeTruthy();
      expect(SECTION_LINES[id]).toBeTruthy();
    }
    for (const page of PAGE_IDS) expect(PAGE_LABELS[page]).toBeTruthy();
  });

  it('labels each marker with its item’s name, or its page’s', () => {
    expect(MARKERS.map((m) => markerLabel(m.marker))).toEqual([
      'About',
      'DataVista',
      'NeuroInsight-AI',
      'Employee Attrition Analysis',
      'KanbanLight',
      'Unified API Ingester',
      'DRDO',
      'AgryBin',
      'V-Surveillance',
      'Web Page Linker',
      'Contact',
    ]);
  });
});

describe('item headings on the pages', () => {
  // The pages give their headings item ids by position, so content order must match item order.
  it('lists the roles in Experience item order', () => {
    expect(experience.roles.map((r) => r.org)).toHaveLength(PAGE_ITEMS.experience!.length);
    experience.roles.forEach((role, i) => expect(role.org.startsWith(ITEM_LABELS[PAGE_ITEMS.experience![i]])).toBe(true));
  });

  // citationFor finds a citation by its item's position, after the write-up's.
  it('keeps the write-up first and then the citations, in Publications item order', () => {
    const titles = [publications.writeUp.title, ...publications.citations.map((c) => c.title)];
    expect(titles).toHaveLength(PAGE_ITEMS.publications!.length);
    expect(titles[0].startsWith('V-Surveillance')).toBe(true);
    expect(titles[1]).toContain('Web Page Linker');
  });
});

describe('Publications page', () => {
  const html = renderToStaticMarkup(createElement(PublicationsPage, { headingId: 'title' }));

  it('shows the V-Surveillance write-up, headed for its marker to open at', () => {
    expect(html).toContain(`id="${itemHeadingId('v-surveillance')}"`);
    expect(html).toContain(publications.writeUp.title);
  });

  it('shows no Web Page Linker: it lives only in its panel', () => {
    const [linker] = publications.citations;
    expect(html).not.toContain(itemHeadingId('web-page-linker'));
    expect(html).not.toContain(linker.title);
    expect(html).not.toContain(linker.doi);
  });
});

describe('what each marker opens', () => {
  it('opens a panel for the short items only, and the page for everything else', () => {
    expect(MARKERS.filter((m) => opensPanel(m.marker.item)).map((m) => m.key)).toEqual(['drdo', 'agrybin', 'web-page-linker']);
    expect(opensPanel('v-surveillance')).toBe(false);
    expect(opensPanel(undefined)).toBe(false);
  });

  it('finds each panel’s content, headed by its marker’s label', () => {
    for (const item of PANEL_ITEMS) {
      const heading = ITEM_PAGE[item] === 'experience' ? roleFor(item)?.org : citationFor(item)?.title;
      expect(heading, item).toBeTruthy();
      expect(heading!.toLowerCase()).toContain(ITEM_LABELS[item].toLowerCase());
    }
  });

  it('shows Web Page Linker’s whole live summary, both sentences', () => {
    expect(citationFor('web-page-linker')?.summary).toBe(
      'A Python object-oriented wrapper that encapsulates web-page <div> functionality into reusable classes. My part: researching and comparing candidate approaches and technologies, and contributing to the OOP-based implementation.',
    );
  });
});

describe('Experience captions', () => {
  it('names the roles without repeating the box labels', () => {
    expect(SECTION_LINES.experience).toBe('Research and Development Intern · Web/App Developer');
    for (const item of PAGE_ITEMS.experience!) expect(SECTION_LINES.experience).not.toContain(ITEM_LABELS[item]);
  });

  it('adds the Mahyco line from the Experience content as a second line', () => {
    expect(SECTION_NOTES.experience).toBe(experience.also);
    expect(SECTION_NOTES.experience).toMatch(/^Also: .*Mahyco/);
  });
});

describe('nearestMarkerIndex', () => {
  for (const id of ['projects', 'experience', 'publications'] as const) {
    it(`picks the box under a point in the ${id} row`, () => {
      const boxes = sectionLayouts[id].markers.map((m) => m.box);
      boxes.forEach(({ centre }, i) => expect(nearestMarkerIndex(boxes, centre[0], centre[2])).toBe(i));
      expect(nearestMarkerIndex(boxes, -100, 0)).toBe(0);
      expect(nearestMarkerIndex(boxes, 100, 0)).toBe(boxes.length - 1);
    });
  }
});

describe('culling', () => {
  it('draws a section until its nearest side is past the cull distance', () => {
    for (const quality of ['high', 'low'] as const) {
      const far = CULL_DISTANCE[quality];
      expect(sectionInRange(far + 1, 1, quality)).toBe(true);
      expect(sectionInRange(far + 1.01, 1, quality)).toBe(false);
      expect(sectionInRange(0, 1, quality)).toBe(true);
    }
  });

  it('culls nearer at low quality', () => {
    expect(CULL_DISTANCE.low).toBeLessThan(CULL_DISTANCE.high);
    expect(sectionInRange(CULL_DISTANCE.low + 5, 0, 'low')).toBe(false);
    expect(sectionInRange(CULL_DISTANCE.low + 5, 0, 'high')).toBe(true);
  });
});

describe('culling along the path', () => {
  const drawn = (t: number, quality: 'high' | 'low') =>
    SECTION_IDS.filter((id: SectionId) => {
      const b = sectionLayouts[id].bounds;
      const centre = new Vector3(sectionLayout[id].ground[0], b[1], sectionLayout[id].ground[2]);
      return sectionInRange(pathPos(t).distanceTo(centre), Math.hypot(...b), quality);
    });

  it('always draws the section the camera is at', () => {
    for (const quality of ['high', 'low'] as const) {
      for (const id of SECTION_IDS) expect(drawn(SECTION_T[id], quality)).toContain(id);
    }
  });

  it('skips the last section from the landing view at both qualities, and more at low quality', () => {
    expect(drawn(0, 'high')).not.toContain('contact');
    expect(drawn(0, 'low')).not.toContain('contact');
    expect(drawn(0, 'low')).not.toContain('publications');
    expect(drawn(1, 'low')).not.toContain('about');
  });
});

describe('landingOpacity', () => {
  it('is 1 at the start and 0 from the fade point on', () => {
    expect(landingOpacity(0)).toBe(1);
    expect(landingOpacity(LANDING_FADE_T)).toBe(0);
    expect(landingOpacity(0.5)).toBe(0);
    expect(landingOpacity(LANDING_FADE_T / 2)).toBeCloseTo(0.5, 9);
  });
});
