import type { Role } from '../content/types';

/** A role's title, place, dates and points, beneath its heading. Shared by the Experience page and the panels. */
export function RoleBody({ role }: { role: Role }) {
  return (
    <>
      <p>{role.title}</p>
      <p className="muted">
        {role.where} · {role.period}
      </p>
      <ul>
        {role.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </>
  );
}
