/**
 * Whether this visit gets the 3D scene. Runs before any 3D code loads; when it says no, the HTML site shows instead
 * and three.js is never fetched.
 */

type CapabilityWindow = Pick<Window, 'matchMedia'> & { document: Pick<Document, 'createElement'> };

export function sceneSupported(win: CapabilityWindow): boolean {
  if (win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    const canvas = win.document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return false;
    // Frees the probe's context at once, so it doesn't count against the browser's limit.
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}
