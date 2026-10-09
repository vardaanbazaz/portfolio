import type { DesignDecision } from '../content/types';
import { UI } from '../ui/strings';

/** A design decision's problem, decision and result. Shared by the project pages and Publications; each page sets the heading. */
export function DecisionDetails({ decision }: { decision: DesignDecision }) {
  return (
    <dl>
      <dt>{UI.problem}</dt>
      <dd>{decision.problem}</dd>
      <dt>{UI.decision}</dt>
      <dd>{decision.decision}</dd>
      <dt>{UI.result}</dt>
      <dd>{decision.result}</dd>
    </dl>
  );
}
