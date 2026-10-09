import type { SectionLayout, SectionMarker, Vec3 } from './contract';

/** Layout of a section that is a straight row of boxes, one marker each, left to right as seen from the path.
 *  Each entry gives its marker's target and its box's half-extents; neighbouring boxes are `gap` apart. */
export function rowLayout(entries: readonly (Omit<SectionMarker, 'box'> & { half: Vec3 })[], gap: number): SectionLayout {
  const width = entries.reduce((sum, { half }) => sum + 2 * half[0], 0) + gap * (entries.length - 1);
  const tallest = Math.max(...entries.map(({ half }) => half[1]));
  const deepest = Math.max(...entries.map(({ half }) => half[2]));

  let left = -width / 2;
  const markers = entries.map(({ half, ...target }): SectionMarker => {
    const centre: Vec3 = [left + half[0], half[1] - tallest, 0];
    left += 2 * half[0] + gap;
    // Each box stands on the floor (local y = -tallest).
    return { ...target, box: { centre, half } };
  });

  return { bounds: [width / 2, tallest, deepest], markers };
}
