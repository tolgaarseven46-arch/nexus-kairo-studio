import type { SemanticInterpretation, SeverityVector } from "../types/semanticInterpretation";
import { EMPTY_SEVERITY_VECTOR } from "../types/semanticInterpretation";

const INDEPENDENT_HARM_ACTS = new Set<SemanticInterpretation["secondarySocialActs"][number]>([
  "insult",
  "coercion",
  "manipulation",
  "mockery",
  "privacy_violation",
  "boundary_test",
]);

export function hasIndependentRelationshipHarm(interp: SemanticInterpretation): boolean {
  return (
    interp.primaryIntent === "insult" ||
    interp.primaryIntent === "rejection" ||
    interp.primaryIntent === "boundary_test" ||
    interp.secondarySocialActs.some((act) => INDEPENDENT_HARM_ACTS.has(act))
  );
}

export function isRelationshipNeutralQuestionOnlyStop(interp: SemanticInterpretation): boolean {
  return (
    interp.discourseFacets.stopQuestions === true &&
    interp.discourseFacets.stopTalking === false &&
    interp.stopRequest === false &&
    !hasIndependentRelationshipHarm(interp)
  );
}

export function relationshipSeverityForInterpretation(interp: SemanticInterpretation): SeverityVector {
  if (!isRelationshipNeutralQuestionOnlyStop(interp)) return interp.severity;
  return { ...EMPTY_SEVERITY_VECTOR };
}
