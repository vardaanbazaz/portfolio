import type { ExternalLink } from '../content/types';

/** Links that open in a new tab, so the scene stays where the visitor left it. */
export function LinkList({ links }: { links: readonly ExternalLink[] }) {
  return (
    <ul className="link-list">
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
