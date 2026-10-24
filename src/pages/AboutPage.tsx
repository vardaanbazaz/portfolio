import { content } from '../content/pages/about';
import { PAGE_LABELS } from '../content/scene';
import { VERSE } from '../content/verse';
import { UI } from '../ui/strings';
import { Canopy, CANOPY_STYLE, SpiralDivider } from './Canopy';
import type { PageProps } from './contract';
import { LinkList } from './LinkList';

export default function AboutPage({ headingId }: PageProps) {
  const { education } = content;
  return (
    <article className="about" style={CANOPY_STYLE}>
      <Canopy />
      <h1 id={headingId} tabIndex={-1}>
        {PAGE_LABELS.about}
      </h1>

      <SpiralDivider />
      <figure className="verse about-verse">
        <blockquote lang="sa">
          <p className="verse-line">
            {VERSE.lines[0]}
            <br />
            {VERSE.lines[1]}
          </p>
        </blockquote>
        <figcaption>
          <p className="muted verse-gloss">
            {VERSE.translation.join(' ')} <cite>{VERSE.source}</cite>
          </p>
        </figcaption>
      </figure>

      <SpiralDivider />

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

      <SpiralDivider />

      <section>
        <h2>{UI.location}</h2>
        <p>{content.location}</p>
      </section>

      <SpiralDivider />

      <section>
        <h2>{UI.links}</h2>
        <LinkList links={content.links} />
      </section>
    </article>
  );
}
