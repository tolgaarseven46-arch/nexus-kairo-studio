import type { DroitDynamicState, ReasoningTrace } from "../types/nexus";
import type { SemanticInterpretation } from "../types/semanticInterpretation";
import type {
  KairaPreAiHowStateAlignmentCheck,
  KairaPreAiRepairRecoveryCheck,
  KairaPreAiSelfEpistemicCheck,
  KairaPreAiSemanticCompletenessCheck,
} from "./kairaPreAiAudit";
import type { KairaAutobiographicalRecallRuntimeResult } from "./kairaAutobiographicalRecallRuntime";

/**
 * Phase-0 detector projections consume only typed canonical/runtime outputs.
 * They are observability adapters, never semantic authorities: no raw-text
 * parsing or hidden reinterpretation is allowed here.
 */
export function projectPreAiSelfEpistemicCheck(
  interpretation: SemanticInterpretation,
  runtime: KairaAutobiographicalRecallRuntimeResult,
): KairaPreAiSelfEpistemicCheck | null {
  const query = interpretation.discourseFacets.selfMemoryQuery;
  if (!query) return null;
  const resolvedConfidence = runtime.status === "resolved" && runtime.recall
    ? Math.max(
        0,
        ...runtime.recall.selfFacts.map((item) => Number(item.confidence ?? 0)),
        ...runtime.recall.memories.map((item) => Number(item.confidence ?? 0)),
      )
    : 0;
  return {
    factualSelfClaimRequired: true,
    groundedProvenanceKey: null,
    groundedConfidence: resolvedConfidence,
    epistemicQualificationActive:
      runtime.status === "ephemeral" ||
      runtime.status === "missing" ||
      runtime.status === "unavailable",
    epistemicRefusalActive: false,
  };
}

export function projectPreAiSemanticCompletenessCheck(
  interpretation: SemanticInterpretation,
  selectedMove?: string | null,
): KairaPreAiSemanticCompletenessCheck | null {
  const facets = interpretation.discourseFacets;
  const causeKnown = facets.signalsAlreadyAnswered === true || facets.answerFriction === true;
  const correction = facets.discourseAct === "correction";
  if (!causeKnown && !correction) return null;
  return {
    causeKnown,
    selectedMove: selectedMove ?? null,
    correctedFacts: [],
  };
}

const COLD_REGISTERS = new Set(["firm", "distant", "guarded", "cold", "withdrawn"]);
const WARM_REGISTERS = new Set(["warm", "playful", "affectionate"]);

export function projectPreAiHowStateAlignmentCheck(
  state: DroitDynamicState,
  trace: ReasoningTrace,
  responsePlan: { register?: string | null; reasons?: string[] },
): KairaPreAiHowStateAlignmentCheck {
  const internalReaction = state.reactionMode ?? trace.currentMood.reactionMode ?? "neutral";
  const projectedRegister = responsePlan.register ?? trace.decision.chosenTone ?? null;
  const diverges = Boolean(
    projectedRegister &&
    ((internalReaction === "hurt" || internalReaction === "withdrawn" || internalReaction === "irritated")
      ? WARM_REGISTERS.has(projectedRegister)
      : internalReaction === "neutral"
        ? COLD_REGISTERS.has(projectedRegister)
        : false),
  );
  return {
    internalReaction,
    projectedRegister,
    diverges,
    policyReason: diverges
      ? (responsePlan.reasons ?? []).filter(Boolean).join("; ") || trace.decision.explanation || null
      : null,
  };
}

export function projectPreAiRepairRecoveryCheck(
  before: DroitDynamicState,
  after: DroitDynamicState,
  interpretation: SemanticInterpretation,
  trace: ReasoningTrace,
): KairaPreAiRepairRecoveryCheck {
  const repairProgressBefore = Number(before.relationship?.repairProgress ?? 0);
  const repairProgressAfter = Number(after.relationship?.repairProgress ?? 0);
  return {
    repairProgressBefore,
    repairProgressAfter,
    repairAttempt: interpretation.repairAttempt || interpretation.apology,
    recoverySource:
      repairProgressAfter > repairProgressBefore && !interpretation.repairAttempt && !interpretation.apology
        ? trace.memoryUpdate?.reason || null
        : null,
  };
}
