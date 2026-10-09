import { Fragment, type MouseEvent } from 'react';
import { PAGE_LABELS, PROJECT_STATUS, type ProjectPageId } from '../content/scene';
import type { Figure, ProjectBlock, ProjectContent, ProjectSection, TermItem } from '../content/types';
import { UI } from '../ui/strings';
import { DecisionDetails } from './DecisionDetails';
import { LinkList } from './LinkList';
import type { PageProps } from './contract';
import { scrollToHeading } from './scrollToHeading';

interface ProjectPageProps extends PageProps {
  page: ProjectPageId;
  content: ProjectContent;
}

/** Scrolls the page to the section and focuses its heading. The URL stays as it is: a hash would go through the router. */
function goToSection(e: MouseEvent<HTMLAnchorElement>, id: string) {
  const page = e.currentTarget.closest<HTMLElement>('.page');
  const heading = document.getElementById(id);
  if (!page || !heading) return;
  e.preventDefault();
  scrollToHeading(page, heading);
}

function Contents({ sections }: { sections: readonly ProjectSection[] }) {
  return (
    <nav aria-label={UI.contents}>
      <ul className="contents">
        {sections.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`} onClick={(e) => goToSection(e, section.id)}>
              {section.contentsLabel}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The term in bold, then its text, if it has any. */
function termItem(item: TermItem) {
  return (
    <li key={item.term}>
      <strong>{item.term}</strong>
      {item.text && ` ${item.text}`}
    </li>
  );
}

function Block({ block }: { block: ProjectBlock }) {
  switch (block.kind) {
    case 'paragraph':
      return <p>{block.text}</p>;
    case 'terms':
      return <ul>{block.items.map(termItem)}</ul>;
    case 'ranked':
      return <ol>{block.items.map(termItem)}</ol>;
    case 'decision':
      return (
        <>
          <h3>{block.decision.title}</h3>
          <DecisionDetails decision={block.decision} />
        </>
      );
    case 'link':
      return <LinkList links={[block.link]} />;
    case 'formula':
      return (
        <>
          <p className="muted">{block.name}</p>
          <p>
            <code>{block.formula}</code>
          </p>
          <p className="muted">{block.note}</p>
        </>
      );
    case 'figures':
      return <Figures items={block.items} />;
  }
}

function Figures({ items }: { items: readonly Figure[] }) {
  return (
    <dl>
      {items.map((item) => (
        <Fragment key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </Fragment>
      ))}
    </dl>
  );
}

/** A project's full page: header, contents list, then its sections in order. */
export function ProjectPage({ headingId, page, content }: ProjectPageProps) {
  return (
    <article>
      <h1 id={headingId} tabIndex={-1}>
        {PAGE_LABELS[page]}
      </h1>
      <p>{content.subtitle}</p>
      <p className="muted">
        {UI.status} {PROJECT_STATUS[page]}
      </p>
      {content.figures && <Figures items={content.figures} />}
      <p>{content.summary}</p>
      <LinkList links={content.demo ? [content.source, content.demo] : [content.source]} />
      <ul className="pills">
        {content.pills.map((pill) => (
          <li key={pill} className="pill">
            {pill}
          </li>
        ))}
      </ul>

      <Contents sections={content.sections} />

      {content.sections.map((section) => (
        <section key={section.id}>
          <h2 id={section.id} tabIndex={-1}>
            {section.heading}
          </h2>
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </section>
      ))}
    </article>
  );
}
