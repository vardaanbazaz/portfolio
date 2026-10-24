import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AboutPage from '../../src/pages/AboutPage';
import {
  ABOUT_HEADING_COLOR,
  ABOUT_SOURCE_COLOR,
  ABOUT_TEXT_COLOR,
  CANOPY_LIGHT_RGB,
  CANOPY_MOTE_COUNT,
  CANOPY_MOTE_OPACITY,
  CANOPY_SHADE_BOTTOM,
  CANOPY_SHADE_TOP,
  CANOPY_WASH_SECONDS,
  PATCH_OPACITY,
  PATCHES,
  canopyMotes,
} from '../../src/pages/canopy';
import { MOTE_COLOR } from '../../src/scene/tuning';
import { ABOUT_TEXT_RUNS } from '../fixtures/aboutText';

type Rgb = readonly [number, number, number];

const hex = (color: string): Rgb => {
  const n = Number.parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** WCAG relative luminance of an sRGB colour. */
const luminance = ([r, g, b]: Rgb) => {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a: Rgb, b: Rgb) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** `top` painted over `under` at `alpha`, as the browser composites: in sRGB. */
const over = (under: Rgb, top: Rgb, alpha: number): Rgb => under.map((v, i) => top[i] * alpha + v * (1 - alpha)) as unknown as Rgb;

/** The lightest the background can be: its top colour, every patch at its brightest and the brightest mote, all over
 *  one point. They never all meet, so this bounds what the browser can show. */
const lightest = (): Rgb => {
  let color = hex(CANOPY_SHADE_TOP);
  for (const patch of PATCHES) color = over(color, CANOPY_LIGHT_RGB, patch.strength * PATCH_OPACITY.bright);
  return over(color, hex(MOTE_COLOR), CANOPY_MOTE_OPACITY[1]);
};

/** The page's text, run by run: what lies between tags, entities decoded. */
const textRuns = (html: string) =>
  html
    .split(/<[^>]+>/)
    .filter((run) => run.trim() !== '')
    .map((run) => run.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#x27;', "'"));

describe('About page text', () => {
  const html = renderToStaticMarkup(createElement(AboutPage, { headingId: 'title' }));

  it('is word for word what it was before its new look', () => {
    expect(textRuns(html)).toEqual(ABOUT_TEXT_RUNS);
  });

  it('adds only decoration: hidden from assistive technology, with no text of its own', () => {
    expect(html).toMatch(/<div class="canopy" aria-hidden="true">/);
    expect(html.match(/<div class="spiral-divider" aria-hidden="true">/g)).toHaveLength(4);
    expect(html).not.toMatch(/<title|<text|<hr/);
  });

  it('frames the verse with a divider above and below', () => {
    expect(html).toMatch(/<div class="spiral-divider"[^>]*>.*?<\/div><figure class="verse about-verse">.*?<\/figure><div class="spiral-divider"/);
  });
});

describe('About canopy contrast', () => {
  const background = lightest();

  it('keeps body text at 7:1 or more against the lightest the background can be', () => {
    expect(contrast(hex(ABOUT_TEXT_COLOR), background)).toBeGreaterThanOrEqual(7);
  });

  it('keeps headings and the source line at 4.5:1 or more', () => {
    expect(contrast(hex(ABOUT_HEADING_COLOR), background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(ABOUT_SOURCE_COLOR), background)).toBeGreaterThanOrEqual(4.5);
  });

  it('is a shade, not black, lighter at the top', () => {
    expect(luminance(hex(CANOPY_SHADE_BOTTOM))).toBeGreaterThan(0);
    expect(luminance(hex(CANOPY_SHADE_TOP))).toBeGreaterThan(luminance(hex(CANOPY_SHADE_BOTTOM)));
  });
});

describe('About canopy motion', () => {
  it('drifts each light patch over one cycle of 20 to 30 s, resting between its dimmest and brightest', () => {
    expect(PATCHES.length).toBeGreaterThan(0);
    for (const patch of PATCHES) {
      expect(patch.period).toBeGreaterThanOrEqual(20);
      expect(patch.period).toBeLessThanOrEqual(30);
    }
    expect(PATCH_OPACITY.dim).toBeLessThan(PATCH_OPACITY.rest);
    expect(PATCH_OPACITY.rest).toBeLessThan(PATCH_OPACITY.bright);
  });

  it('has about a dozen motes, the same on every load', () => {
    expect(CANOPY_MOTE_COUNT).toBe(12);
    expect(canopyMotes()).toHaveLength(CANOPY_MOTE_COUNT);
    expect(canopyMotes()).toEqual(canopyMotes());
    for (const mote of canopyMotes()) {
      expect(mote.opacity).toBeGreaterThanOrEqual(CANOPY_MOTE_OPACITY[0]);
      expect(mote.opacity).toBeLessThanOrEqual(CANOPY_MOTE_OPACITY[1]);
    }
  });

  it('steps under the canopy over 0.6 s', () => {
    expect(CANOPY_WASH_SECONDS).toBe(0.6);
  });
});
