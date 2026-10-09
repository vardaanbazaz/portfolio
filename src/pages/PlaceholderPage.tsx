import { PAGE_LABELS } from '../content/scene';
import type { PlaceholderContent } from '../content/types';
import type { PageId, PageProps } from './contract';

interface PlaceholderPageProps extends PageProps {
  page: PageId;
  content: PlaceholderContent;
}

/** Stage 1 stand-in: the page's name and its placeholder note. */
export function PlaceholderPage({ headingId, page, content }: PlaceholderPageProps) {
  return (
    <article>
      <h1 id={headingId} tabIndex={-1}>
        {PAGE_LABELS[page]}
      </h1>
      <p>{content.note}</p>
    </article>
  );
}
