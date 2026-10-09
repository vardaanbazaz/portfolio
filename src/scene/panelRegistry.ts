/** The open panel and its leader line: plain DOM over the canvas. PanelLeaderTracker joins them every frame. */
let panel: HTMLElement | null = null;
let leader: SVGLineElement | null = null;

export function registerPanel(el: HTMLElement | null) {
  panel = el;
}

export function registerLeader(el: SVGLineElement | null) {
  leader = el;
}

export const getPanel = () => panel;
export const getLeader = () => leader;
