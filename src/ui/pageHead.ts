import { useEffect } from 'react';
import { LANDING, PAGE_LABELS, SECTION_LINES, SITE_NAME } from '../content/scene';
import type { PageId } from '../pages/contract';
import { UI } from './strings';

/** `/`'s description; index.html carries the same text (tested), for anything that reads the HTML without running it. */
export const HOME_DESCRIPTION = LANDING.subline;

/** Each page's meta description, from text the site already shows: a project's summary, or its section's caption.
 *  A summary loads with its page's content, so no page's content is fetched before that page opens. */
export const pageDescriptions: Record<PageId, () => Promise<string>> = {
  about: async () => SECTION_LINES.about,
  datavista: async () => (await import('../content/pages/datavista')).content.summary,
  'neuroinsight-ai': async () => (await import('../content/pages/neuroinsight-ai')).content.summary,
  attrition: async () => (await import('../content/pages/attrition')).content.summary,
  kanbanlight: async () => (await import('../content/pages/kanbanlight')).content.summary,
  'unified-api-ingester': async () => (await import('../content/pages/unified-api-ingester')).content.summary,
  experience: async () => SECTION_LINES.experience,
  publications: async () => SECTION_LINES.publications,
  contact: async () => SECTION_LINES.contact,
};

function setDescription(text: string) {
  document.querySelector('meta[name="description"]')?.setAttribute('content', text);
}

/** Sets the document title and meta description for the page the URL points at, or for `/` when null. */
export function usePageHead(page: PageId | null) {
  useEffect(() => {
    document.title = page ? UI.pageTitle(PAGE_LABELS[page]) : SITE_NAME;
    if (!page) {
      setDescription(HOME_DESCRIPTION);
      return;
    }
    let current = true;
    void pageDescriptions[page]().then((text) => current && setDescription(text));
    return () => {
      current = false;
    };
  }, [page]);
}
