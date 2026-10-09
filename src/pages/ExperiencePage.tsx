import { content } from '../content/pages/experience';
import { PAGE_LABELS } from '../content/scene';
import type { PageProps } from './contract';

export default function ExperiencePage({ headingId }: PageProps) {
  return (
    <article>
      <h1 id={headingId} tabIndex={-1}>
        {PAGE_LABELS.experience}
      </h1>

      {content.roles.map((role) => (
        <section key={role.org}>
          <h2>{role.org}</h2>
          <p>{role.title}</p>
          <p className="muted">
            {role.where} · {role.period}
          </p>
          <ul>
            {role.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </section>
      ))}

      <p className="muted">{content.also}</p>
    </article>
  );
}
