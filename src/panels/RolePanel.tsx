import type { PanelProps } from '../pages/contract';
import { RoleBody } from '../pages/RoleBody';
import { roleFor } from './roleItem';

/** A role: org, title, place, dates and points. */
export default function RolePanel({ item, headingId }: PanelProps) {
  const role = roleFor(item)!;
  return (
    <>
      <h2 id={headingId} tabIndex={-1}>
        {role.org}
      </h2>
      <RoleBody role={role} />
    </>
  );
}
