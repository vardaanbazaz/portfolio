import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LANDING } from '../../src/content/scene';
import { VERSE } from '../../src/content/verse';
import AboutPage from '../../src/pages/AboutPage';
import { UI } from '../../src/ui/strings';

// The verse as Vardaan gave it, compared code point for code point: nothing retyped or normalised.
const LINE_1 = 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।';
const LINE_2 = 'मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥';
const LANDING_LINE = 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन';

const codePoints = (s: string) => [...s].map((c) => c.codePointAt(0)!.toString(16));

describe('the verse', () => {
  it('keeps the Devanagari exactly as given', () => {
    expect(codePoints(VERSE.lines[0])).toEqual(codePoints(LINE_1));
    expect(codePoints(VERSE.lines[1])).toEqual(codePoints(LINE_2));
  });

  it('gives the landing its first line, without the danda', () => {
    expect(codePoints(LANDING.line)).toEqual(codePoints(LANDING_LINE));
  });

  it('gives the landing the first sentence of the translation, and the source', () => {
    expect(LANDING.gloss).toEqual({ text: 'Your right is to action alone, never to its fruits.', source: 'Bhagavad Gita 2.47' });
  });
});

describe('About page', () => {
  const html = renderToStaticMarkup(createElement(AboutPage, { headingId: 'title' }));

  it('quotes the full verse in two lines, marked Sanskrit, with its translation and source', () => {
    expect(html).toContain(`<blockquote lang="sa"><p class="verse-line">${LINE_1}<br/>${LINE_2}</p></blockquote>`);
    expect(html).toContain(
      '<figcaption><p class="muted verse-gloss">Your right is to action alone, never to its fruits. Let not the fruits of action be ' +
        'your motive, nor let yourself be attached to inaction. <cite>Bhagavad Gita 2.47</cite></p></figcaption>',
    );
  });

  it('puts it under the heading, above Education, with no heading of its own', () => {
    const heading = html.indexOf('</h1>');
    const verse = html.indexOf('<figure');
    const education = html.indexOf(`<h2>${UI.education}</h2>`);
    expect(heading).toBeLessThan(verse);
    expect(verse).toBeLessThan(education);
    expect(html.slice(heading, education)).not.toMatch(/<h[1-6]/);
  });
});

describe('source files', () => {
  const files = import.meta.glob('../../src/**/*', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

  it('hold no placeholder text', () => {
    expect(Object.keys(files).length).toBeGreaterThan(50);
    for (const [path, text] of Object.entries(files)) expect(text, path).not.toMatch(/placeholder/i);
  });
});
