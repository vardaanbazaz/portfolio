import { useState, type MouseEvent } from 'react';
import { SECTION_TITLES, SITE_NAME } from '../content/scene';
import { sectionHash } from '../routes';
import { SECTION_IDS, type SectionId } from '../sections/contract';
import { UI } from './strings';

interface SectionMenuProps {
  onSelect: (id: SectionId) => void;
  /** The site name, first in the list: back to the top of the path. */
  onTop: () => void;
}

/** Persistent list of the site name and every section, shown over the scene and over pages.
 *  Choosing one moves the camera there. On narrow screens the list folds behind a toggle. */
export function SectionMenu({ onSelect, onTop }: SectionMenuProps) {
  const [open, setOpen] = useState(false);

  const choose = (e: MouseEvent<HTMLAnchorElement>, go: () => void) => {
    // Let modified clicks (new tab, new window) through to the browser.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setOpen(false);
    go();
  };

  return (
    <nav className="menu" aria-label={UI.menuLabel}>
      <button
        type="button"
        className="menu-toggle"
        aria-expanded={open}
        aria-controls="menu-list"
        onClick={() => setOpen((o) => !o)}
      >
        {UI.menu}
      </button>
      <ul id="menu-list" className={open ? 'menu-list menu-list-open' : 'menu-list'}>
        <li>
          <a className="menu-link" href="/" onClick={(e) => choose(e, onTop)}>
            {SITE_NAME}
          </a>
        </li>
        {SECTION_IDS.map((id) => (
          <li key={id}>
            <a className="menu-link" href={`/${sectionHash(id)}`} onClick={(e) => choose(e, () => onSelect(id))}>
              {SECTION_TITLES[id]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
