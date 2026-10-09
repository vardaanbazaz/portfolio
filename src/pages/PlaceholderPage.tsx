import type { StopId } from '../stops/contract';
import { STOP_LABELS, UI } from '../ui/strings';

export interface PageProps {
  /** id for the page's h1, which labels the dialog. */
  headingId: string;
}

/** Phase B stand-in: the stop's name and the word "Placeholder". Real pages come from the content file later. */
export function placeholderPage(id: StopId) {
  return function PlaceholderPage({ headingId }: PageProps) {
    return (
      <article>
        <h1 id={headingId} tabIndex={-1}>
          {STOP_LABELS[id]}
        </h1>
        <p>{UI.placeholder}</p>
      </article>
    );
  };
}
