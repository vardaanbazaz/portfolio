import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AboutPage from '../../src/pages/AboutPage';
import {
  ABOUT_HEADING_COLOR,
  ABOUT_SOURCE_COLOR,
  ABOUT_TEXT_COLOR,
  CANOPY_FADE,
  CANOPY_MOTE_COUNT,
  CANOPY_DIM_DISTANCE,
  CANOPY_DIM_FALLBACK,
  CANOPY_DIM_MIN,
  CANOPY_MOTE_OPACITY,
  CANOPY_SHADE_BOTTOM,
  CANOPY_SHADE_TOP,
  CANOPY_SPOT_BRIGHTEST,
  CANOPY_SPOT_FLICKER,
  CANOPY_SPOT_OPACITY,
  CANOPY_SPOT_PERIOD_SECONDS,
  CANOPY_SPOTS,
  CANOPY_WASH_SECONDS,
  GLOW_OPACITY,
  GLOW_PERIOD_SECONDS,
  TEXT_SHADE_OPACITY,
  canopyMotes,
  canopySpots,
  fadeMask,
  spotKeyframes,
} from '../../src/pages/canopy';
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
    expect(html).toMatch(/<div class="canopy" aria-hidden="true"><\/div>/);
    expect(html).toMatch(/<div class="canopy-crown" aria-hidden="true">/);
    expect(html).toMatch(/<img class="canopy-image"[^>]* alt=""/);
    expect(html.match(/<div class="spiral-divider" aria-hidden="true">/g)).toHaveLength(4);
    expect(html).not.toMatch(/<title|<text|<hr/);
  });

  it('frames the verse with a divider above and below', () => {
    expect(html).toMatch(/<div class="spiral-divider"[^>]*>.*?<\/div><figure class="verse about-verse text-shade"[^>]*>.*?<\/figure><div class="spiral-divider"/);
  });
});

describe('About canopy contrast', () => {
  // Over the painting, contrast is measured in the browser, line by line (tests/e2e/about-canopy.spec.ts). Below it,
  // the page reads on the plain shade, lightest at its top.
  const background = hex(CANOPY_SHADE_TOP);

  it('keeps body text at 7:1 or more on the plain shade', () => {
    expect(contrast(hex(ABOUT_TEXT_COLOR), background)).toBeGreaterThanOrEqual(7);
  });

  it('keeps headings and the source line at 4.5:1 or more on the plain shade', () => {
    expect(contrast(hex(ABOUT_HEADING_COLOR), background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hex(ABOUT_SOURCE_COLOR), background)).toBeGreaterThanOrEqual(4.5);
  });

  it('is a shade, not black, lighter at the top', () => {
    expect(luminance(hex(CANOPY_SHADE_BOTTOM))).toBeGreaterThan(0);
    expect(luminance(hex(CANOPY_SHADE_TOP))).toBeGreaterThan(luminance(hex(CANOPY_SHADE_BOTTOM)));
  });
});

describe('About canopy painting', () => {
  it('fades out through its lower part, from opaque to clear, never brightening on the way', () => {
    const alphas = [...fadeMask().matchAll(/rgb\(0 0 0 \/ ([\d.]+)\)/g)].map((m) => Number(m[1]));
    expect(alphas[0]).toBe(1);
    expect(alphas.at(-1)).toBe(0);
    for (let i = 1; i < alphas.length; i++) expect(alphas[i]).toBeLessThanOrEqual(alphas[i - 1]);
    expect(CANOPY_FADE[0]).toBeLessThanOrEqual(2 / 3);
    expect(CANOPY_FADE[1]).toBe(1);
  });

  it('dims to a quarter over 1.2 view heights of scroll, and holds halfway without scroll-driven animation', () => {
    expect(CANOPY_DIM_MIN).toBe(0.25);
    expect(CANOPY_DIM_DISTANCE).toBe(1.2);
    expect(CANOPY_DIM_FALLBACK).toBeCloseTo((1 + CANOPY_DIM_MIN) / 2, 10);
  });
});

describe('About canopy light', () => {
  it('has 5 to 7 spots, each inside the painting and away from its edges, the same on every load', () => {
    expect(CANOPY_SPOTS.length).toBeGreaterThanOrEqual(5);
    expect(CANOPY_SPOTS.length).toBeLessThanOrEqual(7);
    expect(canopySpots()).toEqual(canopySpots());
    for (const spot of CANOPY_SPOTS) {
      for (const v of [spot.x, spot.y]) {
        expect(v - spot.size / 2).toBeGreaterThan(0);
        expect(v + spot.size / 2).toBeLessThan(1);
      }
    }
  });

  it('flickers each spot on its own period between 2 and 5 s, no two alike', () => {
    const periods = canopySpots().map((spot) => spot.period);
    for (const period of periods) {
      expect(period).toBeGreaterThanOrEqual(CANOPY_SPOT_PERIOD_SECONDS[0]);
      expect(period).toBeLessThanOrEqual(CANOPY_SPOT_PERIOD_SECONDS[1]);
    }
    expect(CANOPY_SPOT_PERIOD_SECONDS).toEqual([2, 5]);
    expect(new Set(periods.map((p) => p.toFixed(2))).size).toBe(periods.length);
  });

  it('flickers between dim and bright, brightest at its stated offset', () => {
    const frames = spotKeyframes();
    const opacities = frames.map((frame) => frame.opacity as number);
    expect(Math.min(...opacities)).toBeCloseTo(CANOPY_SPOT_OPACITY.dim, 10);
    expect(Math.max(...opacities)).toBeCloseTo(CANOPY_SPOT_OPACITY.bright, 10);
    expect(frames.find((frame) => frame.opacity === Math.max(...opacities))!.offset).toBe(CANOPY_SPOT_BRIGHTEST);
    expect(CANOPY_SPOT_FLICKER[0]).toEqual([0, 0]);
    expect(CANOPY_SPOT_FLICKER.at(-1)).toEqual([1, 0]);
  });
});

describe('About text shades', () => {
  it('are lighter further down the page, never heavier than they were', () => {
    // The heading is large text, held to 4.5:1 rather than 7:1, so it may sit on a lighter shade than the verse.
    const { heading, verse, education, location, links } = TEXT_SHADE_OPACITY;
    expect(heading).toBeLessThanOrEqual(0.8);
    expect(verse).toBeLessThanOrEqual(0.8);
    expect(education).toBeLessThanOrEqual(verse);
    expect(location).toBeLessThanOrEqual(education);
    expect(links).toBeLessThanOrEqual(location);
  });
});

describe('About canopy motion', () => {
  it('breathes the glow slowly, over about 10 s, resting below its brightest', () => {
    expect(GLOW_PERIOD_SECONDS).toBe(10);
    expect(GLOW_OPACITY.rest).toBeLessThan(GLOW_OPACITY.bright);
  });

  it('has a dozen clearly visible motes, the same on every load', () => {
    expect(CANOPY_MOTE_COUNT).toBe(12);
    expect(canopyMotes()).toHaveLength(CANOPY_MOTE_COUNT);
    expect(canopyMotes()).toEqual(canopyMotes());
    expect(CANOPY_MOTE_OPACITY).toEqual([0.25, 0.5]);
    for (const mote of canopyMotes()) {
      expect(mote.opacity).toBeGreaterThanOrEqual(CANOPY_MOTE_OPACITY[0]);
      expect(mote.opacity).toBeLessThanOrEqual(CANOPY_MOTE_OPACITY[1]);
    }
  });

  it('steps under the canopy over 0.6 s', () => {
    expect(CANOPY_WASH_SECONDS).toBe(0.6);
  });
});
