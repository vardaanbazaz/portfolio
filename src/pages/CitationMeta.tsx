import type { Citation } from '../content/types';
import { UI } from '../ui/strings';

/** Venue, date, authors with role, and the DOI and IEEE Xplore links. Shared by the Publications page and the panels. */
export function CitationMeta({ paper }: { paper: Citation }) {
  return (
    <>
      <p className="muted">
        {paper.venue} · {paper.date}
      </p>
      <p>
        {UI.authors} {paper.authors.join(', ')} <span className="pill">{paper.authorRole}</span>
      </p>
      <ul className="link-list">
        <li>
          <a href={`https://doi.org/${paper.doi}`} target="_blank" rel="noreferrer">
            {UI.doiLink(paper.doi)}
          </a>
        </li>
        <li>
          <a href={paper.xploreUrl} target="_blank" rel="noreferrer">
            {UI.openOnXplore}
          </a>
        </li>
      </ul>
    </>
  );
}
