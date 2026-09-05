import type { ReasoningTrace } from "../types/nexus";
import type { KairaResponsePlan } from "./kairaResponsePlan";
import {
  findKairaResponsePlanIssues,
} from "./kairaResponsePlan";
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
import { findKairaAmbiguityPreservationIssues } from "./kairaAmbiguityPreservation";

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
   * move / rhythm) that must also hold on the final delivered text. The
   * DialogueDecision-owned obligation criteria arrive through this validator;
   * this final boundary does not invent its own fulfillment semantics.
   */
  additionalIssueFinder?: (reply: string) => string[];
  /**
   * Legacy dialogue-owned deterministic fallback hook for non-obligation moves.
   * The final boundary may validate it, but never manufactures a replacement of
   * its own. For answer/clarify obligations the dialogue fallback is null, so
   * recovery remains in the normal generation/repair pipeline.
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

  // Mechanical enforcement may trim length/emoji/humor, but question permission
  // is a social WHAT/WHETHER contract. Do not let the legacy enforcer rewrite a
  // forbidden question into a canned acknowledgement; final plan/dialogue
  // conformance below owns rejection and normal repair owns recovery.
  const planEnforcement = enforceKairoResponse(epistemicGuard.reply, input.trace, {
    continueConversation: input.plan.continueConversation,
    humorAllowed: input.plan.allowHumor,
    askQuestion: true,
    emojiBudget: input.plan.emojiBudget,
    maxSentences: input.plan.maxSentences,
    maxWords: input.plan.maxWords,
  });
  const delivered = planEnforcement.reply.trim();

  const issues = [
    ...findKairaResponsePlanIssues(delivered, input.plan),
    ...findKairaAmbiguityPreservationIssues(delivered, input.plan),
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
 * Canonical final-delivery boundary.
 *
 * Order is fixed and explicit:
 *   world truth -> autobiographical truth -> epistemic truth -> ResponsePlan
 *   deterministic mechanical enforcement -> externally-owned dialogue/grounding checks.
 *
 * This boundary never writes a generic social reply. A caller-supplied legacy
 * dialogue fallback can be tried only if it independently passes the exact same
 * ordered constraints. Otherwise the original candidate and its issues are kept
 * visible so a normal DialogueDecision -> ResponsePlan -> Realizer repair can
 * own recovery instead of a hidden guard author.
 */
export function runKairaResponseConstraintPass(
  input: KairaResponseConstraintPassInput,
): KairaResponseConstraintPassResult {
  const first = runOrderedPass(input.reply, input);
  let final = first;
  let fallbackUsed = false;

  if (first.issues.length > 0) {
    const preferredFallback = String(input.fallbackFactory?.() ?? "").trim();
    if (preferredFallback) {
      const candidate = runOrderedPass(preferredFallback, input);
      if (candidate.issues.length === 0) {
        final = candidate;
        fallbackUsed = true;
      }
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
