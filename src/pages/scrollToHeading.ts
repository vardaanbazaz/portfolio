/** Focuses a heading on a page and scrolls the page to it, leaving its scroll margin above it.
 *  Scrolls only the page itself, never the window: the camera follows the window's scroll position. */
export function scrollToHeading(page: HTMLElement, heading: HTMLElement) {
  heading.focus({ preventScroll: true });
  const offset = heading.getBoundingClientRect().top - page.getBoundingClientRect().top;
  page.scrollTop += offset - parseFloat(getComputedStyle(heading).scrollMarginTop);
}
