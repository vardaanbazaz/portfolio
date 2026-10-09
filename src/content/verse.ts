/**
 * Bhagavad Gita 2.47, the one copy of the verse. The landing shows its first line and the first sentence of its
 * translation; About shows it in full. Loaded with the scene and with About. Devanagari exactly as Vardaan gave it.
 */

export const VERSE = {
  /** Two lines, each with its closing danda. Marked lang="sa" wherever shown. */
  lines: ['कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।', 'मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥'],
  /** The English translation, one sentence per line of the verse. */
  translation: [
    'Your right is to action alone, never to its fruits.',
    'Let not the fruits of action be your motive, nor let yourself be attached to inaction.',
  ],
  source: 'Bhagavad Gita 2.47',
} as const;

/** The verse's first line without its danda: the landing's main line. */
export const VERSE_FIRST_LINE = VERSE.lines[0].replace(/ ।$/, '');
