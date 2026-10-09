import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { content as attrition } from '../../src/content/pages/attrition';
import { content as datavista } from '../../src/content/pages/datavista';
import { content as experience } from '../../src/content/pages/experience';
import { content as kanbanlight } from '../../src/content/pages/kanbanlight';
import { content as ingester } from '../../src/content/pages/unified-api-ingester';
import { content as neuroinsight } from '../../src/content/pages/neuroinsight-ai';
import { content as publications } from '../../src/content/pages/publications';
import {
  ITEM_LABELS,
  markerLabel,
  PAGE_LABELS,
  PROJECT_STATUS,
  projectsCaption,
  SECTION_LINES,
  SECTION_NOTES,
  SECTION_TITLES,
} from '../../src/content/scene';
import { ITEM_PAGE, itemHeadingId, opensPanel, PAGE_IDS, PAGE_ITEMS, PANEL_ITEMS } from '../../src/pages/contract';
import AttritionPage from '../../src/pages/AttritionPage';
import DataVistaPage from '../../src/pages/DataVistaPage';
import IngesterPage from '../../src/pages/IngesterPage';
import KanbanLightPage from '../../src/pages/KanbanLightPage';
import NeuroInsightPage from '../../src/pages/NeuroInsightPage';
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

  it('heads the design decision with its name and labels its parts', () => {
    expect(html).toContain('<h3>Design decision: SAHI slicing for small objects</h3>');
    for (const label of ['Problem', 'Decision', 'Result']) expect(html).toContain(`<dt>${label}</dt>`);
  });

  it('lets the ordered list number the pipeline steps', () => {
    expect(html).toContain('<ol class="pipeline">');
    expect(html).not.toContain('Stage 0');
  });
});

const projectPages = [
  { name: 'DataVista', page: 'datavista', Page: DataVistaPage, content: datavista },
  { name: 'NeuroInsight-AI', page: 'neuroinsight-ai', Page: NeuroInsightPage, content: neuroinsight },
  { name: 'Employee Attrition Analysis', page: 'attrition', Page: AttritionPage, content: attrition },
  { name: 'KanbanLight', page: 'kanbanlight', Page: KanbanLightPage, content: kanbanlight },
  { name: 'Unified API Ingester', page: 'unified-api-ingester', Page: IngesterPage, content: ingester },
] as const;

/** The live pages of the two projects in development have no design decisions. */
const withoutDecisions: readonly string[] = ['kanbanlight', 'unified-api-ingester'];

for (const { name, page, Page, content } of projectPages) {
  describe(`${name} page`, () => {
    const html = renderToStaticMarkup(createElement(Page, { headingId: 'title' }));

    it('links each contents entry to a section heading on the page', () => {
      for (const section of content.sections) {
        expect(html).toContain(`href="#${section.id}"`);
        expect(html).toContain(`<h2 id="${section.id}" tabindex="-1">`);
      }
    });

    it('labels each contents entry as its heading', () => {
      for (const section of content.sections) expect(section.contentsLabel).toBe(section.heading);
    });

    it('shows its status as plain text from the scene content', () => {
      expect(html).toContain(`Status: ${PROJECT_STATUS[page]}`);
    });

    it('shows no ID code, category label or decision badge', () => {
      // ID codes such as the old record and page codes: capitals, a hyphen, digits.
      expect(html).not.toMatch(/\b[A-Z]{2,}-\d{3,}\b/);
      for (const text of ['MANUSCRIPT', 'CATEGORY', 'Feature Build', 'Active Build', 'Pipeline Engine', 'ACCEPTED']) {
        expect(html).not.toContain(text);
      }
    });

    it('gives its section headings and contents entries no numbers', () => {
      for (const section of content.sections) {
        expect(section.heading).not.toMatch(/^\d/);
        expect(section.contentsLabel).not.toMatch(/^\d/);
      }
    });

    const decisions = content.sections.flatMap((s) => s.blocks).filter((b) => b.kind === 'decision');
    if (withoutDecisions.includes(page)) {
      it('has no design decisions, as on the live page', () => {
        expect(decisions).toHaveLength(0);
      });
    } else {
      it('labels each design decision Problem, Decision and Result', () => {
        expect(decisions.length).toBeGreaterThan(0);
        for (const label of ['Problem', 'Decision', 'Result']) expect(html).toContain(`<dt>${label}</dt>`);
      });
    }
  });
}

describe('KanbanLight page', () => {
  const html = renderToStaticMarkup(createElement(KanbanLightPage, { headingId: 'title' }));

  it('shows the version and build state in the subtitle', () => {
    expect(html).toContain('<p>Git-style Kanban board · v0.0.1 (early build)</p>');
  });

  it('links the source and the demo, labelled as an early build', () => {
    expect(html).toContain('href="https://github.com/vardaanbazaz/kanbanlight"');
    expect(html).toContain('href="https://kanbanlight.vercel.app" target="_blank" rel="noreferrer">Live demo · early build</a>');
  });

  it('never mentions merging', () => {
    expect(html).not.toMatch(/merg/i);
  });
});

describe('Unified API Ingester page', () => {
  const html = renderToStaticMarkup(createElement(IngesterPage, { headingId: 'title' }));

  it('shows the three figures as a plain list', () => {
    expect(html).toContain(
      '<dl><dt>Tests:</dt><dd>Unit-tested, CI on GitHub Actions</dd><dt>Persistence Engine:</dt><dd>DuckDB + Parquet Lake</dd><dt>Partitioning Scheme:</dt><dd>Hive-style UTC date partitions</dd></dl>',
    );
  });

  it('uses no benchmark or specifications wording', () => {
    expect(JSON.stringify(ingester)).not.toMatch(/benchmark|specification/i);
    expect(html).not.toMatch(/benchmark|specification/i);
  });

  it('keeps the work-in-progress note', () => {
    expect(html).toContain('<p>Work in progress; details may change.</p>');
  });

  it('links the repo only', () => {
    expect(ingester.demo).toBeUndefined();
    expect([...html.matchAll(/href="http/g)]).toHaveLength(1);
    expect(html).toContain('href="https://github.com/vardaanbazaz/unified-api-ingester"');
  });

  it('shows every line of the write-up unchanged', () => {
    const lines = [
      'A Python pipeline that pulls from a REST API and writes to two sinks.',
      '<strong>Source:</strong> OpenBreweryDB REST API.',
      '<strong>Retries:</strong> configurable exponential backoff on transient 4xx/5xx errors.',
      '<strong>DuckDB sink:</strong> idempotent upserts with ON CONFLICT (id) DO UPDATE.',
      '<strong>Parquet sink:</strong> data lake with Hive-style UTC date partitions.',
      '<strong>Config:</strong> config/config.yaml, with CLI overrides.',
      '<strong>Runtime:</strong> Python 3.10+.',
      '<strong>Tests:</strong> unit-tested, CI on GitHub Actions.',
    ];
    for (const line of lines) expect(html).toContain(line);
  });
});

it('gives every project section heading an id no other project uses', () => {
  const ids = projectPages.flatMap(({ content }) => content.sections.map((s) => s.id));
  expect(new Set(ids).size).toBe(ids.length);
});

describe('NeuroInsight-AI credits', () => {
  const text = JSON.stringify(neuroinsight);

  it('credits the starting repo and the fPI paper', () => {
    expect(text).toContain('github.com/bhanmrinal/fPI-Parkison-Analyser-using-Acoustic-Sound-Features');
    expect(text).toContain(
      "“fPI: A Novel Index for Predictive Analysis of Parkinson's Disease Using Acoustic Sound Feature” by Gautam Gupta, Mrinal Bhan and Sahil Nimsarkar",
    );
  });

  it("gives the dataset's labels in the repo README's wording, in both places", () => {
    const wording = "(147 recordings labeled Parkinson's, 48 labeled healthy control)";
    expect(text.split(wording)).toHaveLength(3);
    expect(text).not.toContain('147 PD');
  });

  it('uses the decided subtitle and shows the accuracy with its baseline', () => {
    expect(neuroinsight.subtitle).toBe('Voice-classification research');
    expect(neuroinsight.figures).toEqual([
      { label: 'Accuracy:', value: '0.796 ± 0.098' },
      { label: 'Baseline:', value: '0.756 ± 0.067' },
    ]);
  });
});

describe('Employee Attrition Analysis credit', () => {
  it('credits the starting repo word for word', () => {
    expect(JSON.stringify(attrition)).toContain(
      'Refurbished from an earlier attrition analysis (github.com/bhanmrinal/Employee-Attrition-and-Churn-Analysis).',
    );
  });
});

describe('Projects caption', () => {
  it('has a status for each project marker, and no others', () => {
    expect(Object.keys(PROJECT_STATUS).sort()).toEqual(sectionLayouts.projects.markers.map((m) => m.page).sort());
  });

  it('counts the projects by status', () => {
    expect(SECTION_LINES.projects).toBe('3 completed · 2 in development');
    expect(projectsCaption({ a: 'In Development' })).toBe('1 in development');
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

  it('shows Web Page Linker’s whole summary, both sentences', () => {
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
