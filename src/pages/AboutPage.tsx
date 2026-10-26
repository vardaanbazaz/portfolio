import { content } from '../content/pages/about';
import { PAGE_LABELS } from '../content/scene';
import { VERSE } from '../content/verse';
import { UI } from '../ui/strings';
import { Canopy, CANOPY_STYLE, SpiralDivider, textShade } from './Canopy';
import type { PageProps } from './contract';
import { LinkList } from './LinkList';

/** Fetches the canopy painting ahead of opening (see `src/preload.ts`). */
export { warmCanopy as warm } from './Canopy';

export default function AboutPage({ headingId }: PageProps) {
  const { education } = content;
  return (
    <article className="about" style={CANOPY_STYLE}>
      <Canopy />
      <h1 id={headingId} className="text-shade" style={textShade('heading')} tabIndex={-1}>
        {PAGE_LABELS.about}
      </h1>

      <SpiralDivider />
      <figure className="verse about-verse text-shade" style={textShade('verse')}>
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

      <section className="text-shade" style={textShade('education')}>
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

      <section className="text-shade" style={textShade('location')}>
        <h2>{UI.location}</h2>
        <p>{content.location}</p>
      </section>

      <SpiralDivider />

      <section className="text-shade" style={textShade('links')}>
        <h2>{UI.links}</h2>
        <LinkList links={content.links} />
      </section>
    </article>
  );
}
