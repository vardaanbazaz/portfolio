export type CopyState = 'idle' | 'copied' | 'failed';

/** Selects a node's text so it can be copied by hand when the clipboard API is missing or refused. */
function selectText(node: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Copies `text` to the clipboard. Resolves 'copied' only once the clipboard has accepted it;
 *  otherwise selects `fallback`'s text and resolves 'failed'. */
export async function copyText(text: string, fallback: HTMLElement | null): Promise<CopyState> {
  try {
    if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    if (fallback) selectText(fallback);
    return 'failed';
  }
}
