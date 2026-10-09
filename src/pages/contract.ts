/** Every full page. A page belongs to exactly one section and has one marker there,
 *  or one marker per item when it has items (see `src/sections/layouts.ts`). */
export type PageId =
  | 'about'
  | 'datavista'
  | 'neuroinsight-ai'
  | 'attrition'
  | 'kanbanlight'
  | 'unified-api-ingester'
  | 'experience'
  | 'publications'
  | 'contact';

export const PAGE_IDS: readonly PageId[] = [
  'about',
  'datavista',
  'neuroinsight-ai',
  'attrition',
  'kanbanlight',
  'unified-api-ingester',
  'experience',
  'publications',
  'contact',
];

/** A part of a page that has its own marker in the scene (one role, one paper). It has no URL of its own:
 *  its marker opens either its panel in the scene or the page scrolled to it (see `PANEL_ITEMS`). Unique across the site. */
export type ItemId = 'drdo' | 'agrybin' | 'v-surveillance' | 'web-page-linker';

/** Short items: their marker opens a panel beside their box in the scene, and the URL stays as it is.
 *  Every other item is a long write-up, and its marker opens its page scrolled to it.
 *  The Experience page still shows its panel items; the Publications page shows only its write-up. */
export const PANEL_ITEMS = ['drdo', 'agrybin', 'web-page-linker'] as const satisfies readonly ItemId[];

export type PanelItemId = (typeof PANEL_ITEMS)[number];

export const opensPanel = (item: ItemId | null | undefined): item is PanelItemId =>
  item != null && (PANEL_ITEMS as readonly ItemId[]).includes(item);

/** Each page's items, in the order the page shows them. Pages not listed have none. */
export const PAGE_ITEMS: Partial<Record<PageId, readonly ItemId[]>> = {
  experience: ['drdo', 'agrybin'],
  publications: ['v-surveillance', 'web-page-linker'],
};

/** The page an item belongs to. */
export const ITEM_PAGE = Object.fromEntries(
  (Object.entries(PAGE_ITEMS) as [PageId, readonly ItemId[]][]).flatMap(([page, items]) => items.map((item) => [item, page])),
) as Record<ItemId, PageId>;

/** id for an item's heading on its page: the page scrolls to it and focuses it when the item's marker opened the page. */
export const itemHeadingId = (item: ItemId) => `item-${item}`;

/** id for a panel's heading, which labels the panel. */
export const panelHeadingId = (item: PanelItemId) => `panel-title-${item}`;

export interface PageProps {
  /** id for the page's h1, which labels the main landmark. */
  headingId: string;
}

export interface PanelProps {
  item: PanelItemId;
  /** id for the panel's heading, which labels the panel. */
  headingId: string;
}
