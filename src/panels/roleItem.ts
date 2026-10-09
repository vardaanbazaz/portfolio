import { content } from '../content/pages/experience';
import type { Role } from '../content/types';
import { PAGE_ITEMS, type ItemId } from '../pages/contract';

/** The role an Experience item names. Roles are in item order (tested), as on the page. */
export const roleFor = (item: ItemId): Role | undefined => content.roles[PAGE_ITEMS.experience!.indexOf(item)];
