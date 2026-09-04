import type { ReasoningTrace } from "../types/nexus";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import {
  findKairaResponsePlanIssues,
} from "./kairaResponsePlan";
import {
  buildKairaDialogueObligationFallback,
  findKairaDialogueObligationIssues,
} from "./kairaDialogueObligation";
import {
  enforceKairoResponse,
  validateKairoResponse,
  type KairoResponseEnforcementResult,
  type ResponseConsistencyResult,
} from "./kairoResponseConsistency";
import {
  enforceWorldModelRecallResponse,
  findWorldModelResponseIssues,
  type WorldModelResponseGuardResult,
} from "./worldModelResponseGuard";
import {
  enforceKairaAutobiographicalResponse,
  type KairaAutobiographicalResponseGuardResult,
} from "./kairaAutobiographicalResponseGuard";
import {
  enforceKairaEpistemicResponse,
  findKairaEpistemicResponseIssues,
  type KairaEpistemicEnforcementResult,
} from "./kairaEpistemicResponsePolicy";

export type KairaConstraintWorldItems = Parameters<typeof enforceWorldModelRecallResponse>[1];
export type KairaConstraintWorldContext = Parameters<typeof enforceWorldModelRecallResponse>[2];
export type KairaConstraintSelfMemoryRuntime = Parameters<typeof enforceKairaAutobiographicalResponse>[1];
export type KairaConstraintEpistemicContext = Parameters<typeof enforceKairaEpistemicResponse>[1];

export interface KairaResponseConstraintPassInput {
  reply: string;
  trace: ReasoningTrace;
  plan: KairaResponsePlan;
  worldItems: KairaConstraintWorldItems;
  worldContext: KairaConstraintWorldContext;
  selfMemoryRuntime: KairaConstraintSelfMemoryRuntime;
  epistemicContext?: KairaConstraintEpistemicContext;
  /**
   * Lower-authority delivery-quality checks (grounding / attribution / dialogue
   * move / rhythm) that must also hold on the final delivered text. Keeping
   * them inside this pass prevents a candidate from being marked invalid only
   * after the fallback decision has already finished.
   */
  additionalIssueFinder?: (reply: string) => string[];
  /**
   * Optional grounded/dialogue-aware fallback. It is never trusted directly:
   * the same ordered truth + plan + obligation + delivery-quality pass is
   * applied to it before delivery.
   */
  fallbackFactory?: () => string | null;
}

export interface KairaCanonicalConsistencyResult extends ResponseConsistencyResult {
  mode: "canonical_plan";
}

export interface KairaResponseConstraintPassResult {
  reply: string;
  changed: boolean;
  reasons: string[];
  issues: string[];
  worldGuard: WorldModelResponseGuardResult;
  autobiographicalGuard: KairaAutobiographicalResponseGuardResult;
  epistemicGuard: KairaEpistemicEnforcementResult;
  planEnforcement: KairoResponseEnforcementResult;
  consistency: KairaCanonicalConsistencyResult;
  fallbackUsed: boolean;
}

const structuralConsistency = (
  delivered: string,
  trace: ReasoningTrace,
  finalIssues: string[],
): KairaCanonicalConsistencyResult => {
  // Reuse the established structural parsing only. The legacy validator's
  // intent/sentiment/chosenTone keyword checks are intentionally NOT canonical
  // acceptance authorities; the resolved KairaResponsePlan is.
  const legacy = validateKairoResponse(delivered, trace);
  const structuralIssues: string[] = [];
  if (!legacy.checks.nonEmpty) structuralIssues.push("Boş yanıt");
  if (!legacy.checks.length) structuralIssues.push("Aşırı uzun yanıt");
  if (!legacy.checks.traceCompleteness) structuralIssues.push("Reasoning trace eksik");

  const issues = [...new Set([...structuralIssues, ...finalIssues])];
  const structuralPassed = [
    legacy.checks.nonEmpty,
    legacy.checks.length,
    legacy.checks.traceCompleteness,
  ].filter(Boolean).length;
  const structuralScore = Math.round((structuralPassed / 3) * 100);
  const score = Math.max(0, structuralScore - finalIssues.length * 15);

  return {
    accepted: issues.length === 0,
    score,
    issues,
    mode: "canonical_plan",
    checks: {
      nonEmpty: legacy.checks.nonEmpty,
      length: legacy.checks.length,
      // Retired as acceptance authorities on the canonical path. They stay
      // present only to preserve the existing telemetry shape.
      intentTone: true,
      sentimentTone: true,
      decisionTone: true,
      relationshipTone: true,
      qualitativeReactionTone: true,
      intimacyBoundary: true,
      traceCompleteness: legacy.checks.traceCompleteness,
    },
  };
};

function runOrderedPass(
  reply: string,
  input: KairaResponseConstraintPassInput,
): Omit<KairaResponseConstraintPassResult, "consistency" | "fallbackUsed"> {
  const original = String(reply ?? "").trim();
  const worldGuard = enforceWorldModelRecallResponse(
    original,
    input.worldItems,
    input.worldContext,
  );
  const autobiographicalGuard = enforceKairaAutobiographicalResponse(
    worldGuard.reply,
    input.selfMemoryRuntime,
  );
  const epistemicGuard = enforceKairaEpistemicResponse(
    autobiographicalGuard.reply,
    input.epistemicContext,
  );

  // Plan is the only social WHAT/WHETHER authority here. Do not pass the old
  // BehaviorContract or conversationState back into the deterministic gate.
  const planEnforcement = enforceKairoResponse(epistemicGuard.reply, input.trace, {
    continueConversation: input.plan.continueConversation,
    humorAllowed: input.plan.allowHumor,
    askQuestion: input.plan.allowQuestion,
    emojiBudget: input.plan.emojiBudget,
    maxSentences: input.plan.maxSentences,
    maxWords: input.plan.maxWords,
  });
  const delivered = planEnforcement.reply.trim();

  const issues = [
    ...findKairaResponsePlanIssues(delivered, input.plan),
    ...findKairaDialogueObligationIssues(delivered, input.plan),
    ...findWorldModelResponseIssues(delivered, input.worldItems, input.worldContext).map(
      (issue) => issue.message,
    ),
    ...findKairaEpistemicResponseIssues(delivered, input.epistemicContext),
    ...(input.additionalIssueFinder?.(delivered) ?? []),
  ];
  const reasons = [
    ...(worldGuard.reason ? [worldGuard.reason] : []),
    ...(autobiographicalGuard.reason ? [autobiographicalGuard.reason] : []),
    ...(epistemicGuard.reason ? [epistemicGuard.reason] : []),
    ...planEnforcement.reasons,
  ];

  return {
    reply: delivered,
    changed:
      delivered !== original ||
      worldGuard.changed ||
      autobiographicalGuard.changed ||
      epistemicGuard.changed ||
      planEnforcement.changed,
    reasons: [...new Set(reasons)],
    issues: [...new Set(issues)],
    worldGuard,
    autobiographicalGuard,
    epistemicGuard,
    planEnforcement,
  };
}

/**
 * PR4 / ADR-0006 canonical final-delivery boundary.
 *
 * Order is fixed and explicit:
 *   world truth -> autobiographical truth -> epistemic truth -> ResponsePlan
 *   deterministic enforcement -> dialogue-obligation conformance -> final
 *   conformance on the delivered text.
 *
 * Any fallback goes through the exact same pass. A DialogueDecision-owned
 * obligation fallback is attempted before the legacy generic acknowledgement,
 * preventing a structurally-clean fallback from silently erasing an active
 * answer/clarify obligation. Consistency is computed only after the final
 * delivered candidate is known.
 */
export function runKairaResponseConstraintPass(
  input: KairaResponseConstraintPassInput,
): KairaResponseConstraintPassResult {
  const first = runOrderedPass(input.reply, input);
  let final = first;
  let fallbackUsed = false;

  if (first.issues.length > 0) {
    fallbackUsed = true;
    const preferredFallback = String(input.fallbackFactory?.() ?? "").trim();
    const obligationFallback = String(
      buildKairaDialogueObligationFallback(input.plan) ?? "",
    ).trim();
    const candidates = [...new Set([
      preferredFallback,
      obligationFallback,
      "tamam",
    ].filter(Boolean))];

    for (const fallback of candidates) {
      const candidate = runOrderedPass(fallback, input);
      final = candidate;
      if (candidate.issues.length === 0) break;
    }
  }

  const consistency = structuralConsistency(final.reply, input.trace, final.issues);
  return {
    ...final,
    changed: final.changed || fallbackUsed || final.reply !== String(input.reply ?? "").trim(),
    reasons: fallbackUsed
      ? [...new Set([...first.reasons, ...final.reasons, "canonical_constraint_fallback"])]
      : final.reasons,
    consistency,
    fallbackUsed,
  };
}
