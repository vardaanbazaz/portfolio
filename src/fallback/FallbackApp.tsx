import { Suspense, useEffect } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router';
import { LANDING, PAGE_LABELS, SECTION_LINES, SECTION_NOTES, SECTION_TITLES } from '../content/scene';
import { CitationMeta } from '../pages/CitationMeta';
import { PAGE_IDS, type PageId } from '../pages/contract';
import { pages } from '../pages/registry';
import { citationFor } from '../panels/citationItem';
import { PAGE_PATHS, pageForPath, sectionForHash, sectionHash } from '../routes';
import { SECTION_IDS } from '../sections/contract';
import { PAGE_SECTION } from '../sections/layouts';
import { usePageHead } from '../ui/pageHead';
import { UI } from '../ui/strings';

/**
 * The plain HTML site, for visitors whose browser can't run the scene or who asked for reduced motion, and for a
 * visit whose WebGL context was lost. Same URLs and the same page components as the scene, rendered as normal
 * documents. It imports no 3D code and no sound.
 */

const HOME_HEADING_ID = 'fallback-title';

/** Web Page Linker has no page; in the scene only its panel shows it, so the fallback home shows it in full. */
const WEB_PAGE_LINKER = citationFor('web-page-linker')!;

export function FallbackHome() {
  return (
    <main className="page page-static" aria-labelledby={HOME_HEADING_ID}>
      <div className="page-column">
        <h1 id={HOME_HEADING_ID}>{LANDING.name}</h1>
        <p>{LANDING.line}</p>
        <p className="muted">{LANDING.subline}</p>

        <nav aria-label={UI.menuLabel}>
          <ul>
            {SECTION_IDS.map((id) => (
              <li key={id}>
                <a href={sectionHash(id)}>{SECTION_TITLES[id]}</a>
              </li>
            ))}
          </ul>
        </nav>

        {SECTION_IDS.map((id) => (
          <section key={id} id={id} aria-labelledby={`fallback-section-${id}`}>
            <h2 id={`fallback-section-${id}`}>{SECTION_TITLES[id]}</h2>
            <p>{SECTION_LINES[id]}</p>
            {SECTION_NOTES[id] && <p>{SECTION_NOTES[id]}</p>}
            <ul>
              {PAGE_IDS.filter((page) => PAGE_SECTION[page] === id).map((page) => (
                <li key={page}>
                  <Link to={PAGE_PATHS[page]}>{PAGE_LABELS[page]}</Link>
                </li>
              ))}
            </ul>
            {id === 'publications' && (
              <article>
                <h3>{WEB_PAGE_LINKER.title}</h3>
                <CitationMeta paper={WEB_PAGE_LINKER} />
                <p>{WEB_PAGE_LINKER.summary}</p>
              </article>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}

function FallbackPage({ page }: { page: PageId }) {
  const Page = pages[page];
  const headingId = `page-title-${page}`;
  return (
    <main className="page page-static" aria-labelledby={headingId}>
      <Link className="fallback-back" to={{ pathname: '/', hash: sectionHash(PAGE_SECTION[page]) }}>
        {UI.back}
      </Link>
      <div className="page-column">
        <Suspense
          fallback={
            <p className="page-loading" role="status">
              {UI.loading}
            </p>
          }
        >
          <Page headingId={headingId} />
        </Suspense>
      </div>
    </main>
  );
}

/** Title and description per URL; each new URL starts at the top, or at the section its hash names. */
function FallbackShell() {
  const { pathname, hash } = useLocation();
  usePageHead(pageForPath(pathname));

  useEffect(() => {
    const section = sectionForHash(hash);
    // The home renders in the same commit, so its section is already in the document.
    const target = section && document.getElementById(section);
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <Routes>
      <Route path="/" element={<FallbackHome />} />
      {PAGE_IDS.map((id) => (
        <Route key={id} path={PAGE_PATHS[id]} element={<FallbackPage page={id} />} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function FallbackApp() {
  return (
    <BrowserRouter>
      <FallbackShell />
    </BrowserRouter>
  );
}
