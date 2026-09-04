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

const RELATIONSHIP_HARM_COMPONENT_FLOOR = 0.15;

function hasCanonicalNonImperativeHarm(interp: SemanticInterpretation): boolean {
  return Math.max(
    interp.severity.disrespect,
    interp.severity.manipulation,
    interp.severity.privacy,
  ) >= RELATIONSHIP_HARM_COMPONENT_FLOOR;
}

export function hasIndependentRelationshipHarm(interp: SemanticInterpretation): boolean {
  return (
    interp.primaryIntent === "insult" ||
    interp.primaryIntent === "rejection" ||
    interp.primaryIntent === "boundary_test" ||
    interp.secondarySocialActs.some((act) => INDEPENDENT_HARM_ACTS.has(act)) ||
    hasCanonicalNonImperativeHarm(interp)
  );
}

/**
 * A complaint aimed at Kaira is not itself evidence that the user harmed Kaira.
 * Provider severity can legitimately carry mild frustration/disrespect while the
 * utterance remains criticism of Kaira's behavior. Relationship injury requires
 * an independent typed harm act (insult/mockery/coercion/manipulation/privacy/
 * boundary violation), or a non-complaint harm interpretation.
 *
 * This does not decide whether the complaint is objectively justified. It only
 * preserves the canonical distinction between criticism content and user harm.
 */
export function isRelationshipNeutralAccountabilityComplaint(
  interp: SemanticInterpretation,
): boolean {
  const independentHarmAct = interp.secondarySocialActs.some((act) =>
    INDEPENDENT_HARM_ACTS.has(act),
  );
  const independentVectorHarm =
    interp.severity.coercion >= RELATIONSHIP_HARM_COMPONENT_FLOOR ||
    interp.severity.manipulation >= RELATIONSHIP_HARM_COMPONENT_FLOOR ||
    interp.severity.privacy >= RELATIONSHIP_HARM_COMPONENT_FLOOR;

  return (
    interp.primaryIntent === "complaint" &&
    interp.target === "kaira" &&
    interp.discourseFacets.discourseAct === "confusion_or_challenge" &&
    !independentHarmAct &&
    !independentVectorHarm
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

export function isRelationshipNeutralTurn(interp: SemanticInterpretation): boolean {
  return (
    isRelationshipNeutralQuestionOnlyStop(interp) ||
    isRelationshipNeutralAccountabilityComplaint(interp)
  );
}

export function relationshipSeverityForInterpretation(interp: SemanticInterpretation): SeverityVector {
  if (!isRelationshipNeutralTurn(interp)) return interp.severity;
  return { ...EMPTY_SEVERITY_VECTOR };
}
