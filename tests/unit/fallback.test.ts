import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { content as attrition } from '../../src/content/pages/attrition';
import { content as contact } from '../../src/content/pages/contact';
import { content as datavista } from '../../src/content/pages/datavista';
import { content as kanbanlight } from '../../src/content/pages/kanbanlight';
import { content as neuroinsight } from '../../src/content/pages/neuroinsight-ai';
import { content as publications } from '../../src/content/pages/publications';
import { content as ingester } from '../../src/content/pages/unified-api-ingester';
import { LANDING, PAGE_LABELS, SECTION_LINES } from '../../src/content/scene';
import { sceneSupported } from '../../src/fallback/capability';
import { FallbackHome } from '../../src/fallback/FallbackApp';
import ContactPage from '../../src/pages/ContactPage';
import { PAGE_IDS } from '../../src/pages/contract';
import { PAGE_PATHS } from '../../src/routes';
import { HOME_DESCRIPTION, pageDescriptions } from '../../src/ui/pageHead';
import indexHtml from '../../index.html?raw';

function fakeWindow({ reducedMotion = false, webgl = true, throws = false } = {}) {
  let lost = false;
  const context = { getExtension: () => ({ loseContext: () => void (lost = true) }) };
  return {
    win: {
      matchMedia: (query: string) => ({ matches: reducedMotion && query === '(prefers-reduced-motion: reduce)' }) as MediaQueryList,
      document: {
        createElement: () => {
          if (throws) throw new Error('blocked');
          return { getContext: () => (webgl ? context : null) };
        },
      } as unknown as Pick<Document, 'createElement'>,
    },
    wasLost: () => lost,
  };
}

describe('capability check', () => {
  it('allows the scene when WebGL works and reduced motion is off, and frees the probe context', () => {
    const { win, wasLost } = fakeWindow();
    expect(sceneSupported(win)).toBe(true);
    expect(wasLost()).toBe(true);
  });

  it('rules the scene out when reduced motion is set, even with WebGL', () => {
    expect(sceneSupported(fakeWindow({ reducedMotion: true }).win)).toBe(false);
  });

  it('rules the scene out without WebGL, or when probing throws', () => {
    expect(sceneSupported(fakeWindow({ webgl: false }).win)).toBe(false);
    expect(sceneSupported(fakeWindow({ throws: true }).win)).toBe(false);
  });
});

describe('page descriptions', () => {
  it('uses each project summary itself', async () => {
    expect(await pageDescriptions.datavista()).toBe(datavista.summary);
    expect(await pageDescriptions['neuroinsight-ai']()).toBe(neuroinsight.summary);
    expect(await pageDescriptions.attrition()).toBe(attrition.summary);
    expect(await pageDescriptions.kanbanlight()).toBe(kanbanlight.summary);
    expect(await pageDescriptions['unified-api-ingester']()).toBe(ingester.summary);
  });

  it('uses the section captions for the other pages', async () => {
    for (const id of ['about', 'experience', 'publications', 'contact'] as const) {
      expect(await pageDescriptions[id]()).toBe(SECTION_LINES[id]);
    }
  });

  it('gives every page a different description', async () => {
    const all = await Promise.all(PAGE_IDS.map((id) => pageDescriptions[id]()));
    expect(new Set(all).size).toBe(PAGE_IDS.length);
  });

  it('puts the home description in index.html, which keeps noindex', () => {
    expect(HOME_DESCRIPTION).toBe(LANDING.subline);
    expect(indexHtml).toContain(`<meta name="description" content="${HOME_DESCRIPTION}" />`);
    expect(indexHtml).toContain('<meta name="robots" content="noindex" />');
  });
});

describe('fallback home', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(FallbackHome)));

  it('shows the landing text', () => {
    expect(html).toContain(`<h1 id="fallback-title">${LANDING.name}</h1>`);
    expect(html).toContain(`<p class="verse-line" lang="sa">${LANDING.line}</p>`);
    expect(html).toContain(`<p class="muted verse-gloss">${LANDING.gloss.text} <cite>${LANDING.gloss.source}</cite></p>`);
    expect(html).toContain(LANDING.subline);
    expect(html.indexOf(LANDING.line)).toBeLessThan(html.indexOf(LANDING.gloss.text));
    expect(html.indexOf(LANDING.gloss.text)).toBeLessThan(html.indexOf(LANDING.subline));
  });

  it('links every page', () => {
    for (const id of PAGE_IDS) expect(html).toContain(`<a href="${PAGE_PATHS[id]}" data-discover="true">${PAGE_LABELS[id]}</a>`);
  });

  it("shows Web Page Linker's citation and summary", () => {
    const paper = publications.citations[0];
    expect(html).toContain(`<h3>${paper.title}</h3>`);
    expect(html).toContain(`href="https://doi.org/${paper.doi}"`);
    expect(html).toContain(`href="${paper.xploreUrl}"`);
    expect(html).toContain(paper.authors.join(', '));
    expect(html).toContain(renderToStaticMarkup(createElement('p', null, paper.summary)));
  });
});

describe('Contact page', () => {
  it('shows the privacy line', () => {
    const html = renderToStaticMarkup(createElement(ContactPage, { headingId: 'title' }));
    expect(html).toContain(renderToStaticMarkup(createElement('p', { className: 'muted' }, contact.privacy)));
  });
});
