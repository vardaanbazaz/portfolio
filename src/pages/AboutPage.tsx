import { content } from '../content/pages/about';
import { PAGE_LABELS } from '../content/scene';
import { UI } from '../ui/strings';
import type { PageProps } from './contract';
import { LinkList } from './LinkList';

export default function AboutPage({ headingId }: PageProps) {
  const { education } = content;
  return (
    <article>
      <h1 id={headingId} tabIndex={-1}>
        {PAGE_LABELS.about}
      </h1>

      <section>
        <h2>{UI.education}</h2>
        <p>{education.institution}</p>
        <p>{education.degree}</p>
        <p className="muted">{education.period}</p>
        <p>{education.grade}</p>
        <h3>{UI.coursework}</h3>
        <ul>
          {education.coursework.map((course) => (
            <li key={course}>{course}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{UI.location}</h2>
        <p>{content.location}</p>
      </section>

      <section>
        <h2>{UI.links}</h2>
        <LinkList links={content.links} />
      </section>
    </article>
  );
}
