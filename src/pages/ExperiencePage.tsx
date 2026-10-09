import { content } from '../content/pages/experience';
import { PAGE_LABELS } from '../content/scene';
import { itemHeadingId, PAGE_ITEMS, type PageProps } from './contract';
import { RoleBody } from './RoleBody';

const ITEMS = PAGE_ITEMS.experience!;

export default function ExperiencePage({ headingId }: PageProps) {
  return (
    <article>
      <h1 id={headingId} tabIndex={-1}>
        {PAGE_LABELS.experience}
      </h1>

      {/* Roles are in item order (tested), so each heading gets its item's id for its marker to open at. */}
      {content.roles.map((role, i) => (
        <section key={role.org}>
          <h2 id={itemHeadingId(ITEMS[i])} tabIndex={-1}>
            {role.org}
          </h2>
          <RoleBody role={role} />
        </section>
      ))}

      <p>{content.also}</p>
    </article>
  );
}
