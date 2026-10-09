import { useRef, useState } from 'react';
import { content } from '../content/pages/publications';
import { PAGE_LABELS } from '../content/scene';
import type { Citation } from '../content/types';
import { UI } from '../ui/strings';
import { itemHeadingId, PAGE_ITEMS, type PageProps } from './contract';
import { copyText, type CopyState } from './copyText';

const ITEMS = PAGE_ITEMS.publications!;

/** Venue, date, authors with role, and the DOI and IEEE Xplore links. Shared by the write-up and the citations. */
function CitationMeta({ paper }: { paper: Citation }) {
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

export default function PublicationsPage({ headingId }: PageProps) {
  const { writeUp, citations } = content;
  const bibtexRef = useRef<HTMLPreElement>(null);
  const [copy, setCopy] = useState<CopyState>('idle');

  const onCopy = async () => setCopy(await copyText(writeUp.bibtex, bibtexRef.current));

  return (
    <article>
      <h1 id={headingId} tabIndex={-1}>
        {PAGE_LABELS.publications}
      </h1>

      {/* The write-up, then the citations, are in item order (tested), so each heading gets its item's id for its marker to open at. */}
      <section>
        <h2 id={itemHeadingId(ITEMS[0])} tabIndex={-1}>
          {writeUp.title}
        </h2>
        <p>{writeUp.subtitle}</p>
        <CitationMeta paper={writeUp} />
        <ul className="pills">
          {writeUp.pills.map((pill) => (
            <li key={pill} className="pill">
              {pill}
            </li>
          ))}
        </ul>

        <h3>{UI.summary}</h3>
        <p>{writeUp.summary}</p>

        <h3>{UI.contribution}</h3>
        <p>{writeUp.contribution}</p>

        <h3>{UI.pipeline}</h3>
        <ol className="pipeline">
          {writeUp.pipeline.map((stage) => (
            <li key={stage.step}>
              <p className="muted">{stage.step}</p>
              <p>
                <strong>{stage.title}</strong>
              </p>
              <p>{stage.description}</p>
            </li>
          ))}
        </ol>

        <h3>{UI.results}</h3>
        {/* Focusable so the table can be scrolled sideways with the keyboard on narrow screens. */}
        <div className="table-scroll" role="region" aria-label={UI.resultsTable} tabIndex={0}>
          <table>
            <thead>
              <tr>
                {UI.resultColumns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {writeUp.results.rows.map((row) => (
                <tr key={row.dataset}>
                  <th scope="row">{row.dataset}</th>
                  <td>{row.description}</td>
                  <td className="number">{row.precision}</td>
                  <td className="number">{row.recall}</td>
                  <td className="number">{row.map50}</td>
                  <td className="number">{row.map5095}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          <code>{writeUp.results.formula}</code>
        </p>
        <p className="muted">{writeUp.results.training}</p>

        <h3>{writeUp.adr.title}</h3>
        <dl>
          <dt>{UI.adrContext}</dt>
          <dd>{writeUp.adr.context}</dd>
          <dt>{UI.adrDecision}</dt>
          <dd>{writeUp.adr.decision}</dd>
          <dt>{UI.adrConsequences}</dt>
          <dd>{writeUp.adr.consequences}</dd>
        </dl>

        <h3>{UI.bibtex}</h3>
        <pre ref={bibtexRef} className="bibtex">
          {writeUp.bibtex}
        </pre>
        <button type="button" onClick={onCopy}>
          {UI.copyBibtex}
        </button>
        <p role="status" className="muted copy-status">
          {copy === 'copied' ? UI.copied : copy === 'failed' ? UI.copyBibtexFailed : ''}
        </p>
      </section>

      {citations.map((paper, i) => (
        <section key={paper.doi}>
          <h2 id={itemHeadingId(ITEMS[i + 1])} tabIndex={-1}>
            {paper.title}
          </h2>
          <CitationMeta paper={paper} />
          <p>{paper.contribution}</p>
        </section>
      ))}
    </article>
  );
}
