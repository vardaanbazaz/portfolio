import { expect } from 'vitest';

/** The width and height a WebP file says it has, read from its header: `file` is its data URL (an `?inline` import). */
export function webpSize(file: string) {
  const bytes = Uint8Array.from(atob(file.split(',')[1]), (c) => c.charCodeAt(0));
  const chunk = String.fromCharCode(...bytes.slice(12, 16));
  expect(['VP8 ', 'VP8X', 'VP8L']).toContain(chunk);
  if (chunk === 'VP8 ') {
    // After the 3-byte frame tag and the start code: 14 bits of width, then 14 of height, each with 2 bits of scale.
    const uint16 = (at: number) => bytes[at] | (bytes[at + 1] << 8);
    return { width: uint16(26) & 0x3fff, height: uint16(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    // After the 0x2f signature: 14 bits of width - 1, then 14 of height - 1, least significant first.
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  const uint24 = (at: number) => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16);
  return { width: uint24(24) + 1, height: uint24(27) + 1 };
}
