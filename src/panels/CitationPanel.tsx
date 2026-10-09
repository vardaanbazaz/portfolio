import { CitationMeta } from '../pages/CitationMeta';
import type { PanelProps } from '../pages/contract';
import { citationFor } from './citationItem';

/** A paper with no write-up: title, venue, date, authors and role, DOI and Xplore links, and its summary. */
export default function CitationPanel({ item, headingId }: PanelProps) {
  const paper = citationFor(item)!;
  return (
    <>
      <h2 id={headingId} tabIndex={-1}>
        {paper.title}
      </h2>
      <CitationMeta paper={paper} />
      <p>{paper.summary}</p>
    </>
  );
}
