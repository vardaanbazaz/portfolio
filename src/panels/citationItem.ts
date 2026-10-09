import { content } from '../content/pages/publications';
import type { Citation } from '../content/types';
import { PAGE_ITEMS, type ItemId } from '../pages/contract';

/** The citation a Publications item names. The write-up's item comes first and then the citations', in item order
 *  (tested); the write-up's own item opens the page, so it has no citation here. */
export const citationFor = (item: ItemId): Citation | undefined =>
  content.citations[PAGE_ITEMS.publications!.indexOf(item) - 1];
