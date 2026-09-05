/**
 * PlanResolver (ADR-0006, PR2/PR5).
 *
 * Resolves HardConstraintSet + SoftTendencyProfile (+ per-turn uncertainty) into
 * a single behavior snapshot. This is NOT a state machine: it is a pure function
 * of the two layers for THIS turn. Hard constraints CLAMP; soft tendencies FILL
 * the room left inside them. `chosenTone` / `register` / speech-style signals are
 * projections only and must never create or revoke WHAT/WHETHER permissions.
 */

import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairoSpeechIdentity } from "./kairoSpeechIdentity";
import type {
  HardConstraintSet,
  KairaExpressionMode,
  KairaPlanProjections,
  KairaPlanUncertainty,
  KairaSocialMove,
  SoftTendencyProfile,
} from "../types/kairaBehaviorPlan";

export interface ResolveKairaPlanInput {
  hard: HardConstraintSet;
  soft: SoftTendencyProfile;
  dialogue: DialogueDecisionPlan;
  speech: KairoSpeechIdentity;
  contract: BehaviorContract;
  uncertainty?: Partial<KairaPlanUncertainty>;
}

export interface ResolvedKairaPlan {
  continueConversation: boolean;
  allowQuestion: boolean;
  allowHumor: boolean;
  allowAffection: boolean;
  allowAdvice: boolean;
  allowForgiveness: boolean;
  allowReopeningCloseness: boolean;
  flirtationAllowed: boolean;
  counterFlirtAllowed: boolean;
  maxSentences: number;
  maxWords: number;
  emojiBudget: number;
  opennessAxis: number;
  warmthAxis: number;
  guardedness: number;
  intimacyCeiling: number;
  requiredContent: string[];
  hardReasons: string[];
  uncertainty: KairaPlanUncertainty;
  projections: KairaPlanProjections;
  socialMove: KairaSocialMove;
  resolverRationale: string[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function toneProjection(soft: SoftTendencyProfile, hard: HardConstraintSet): string {
  if (hard.hardDisengage) return "closed";
  if (hard.mustAcknowledgeBoundary) return "repairing-careful";
  if (soft.warmthTendency >= 0.6 && soft.guardedness <= 0.35) return "warm-open";
  if (soft.guardedness >= 0.6) return "reserved";
  if (soft.warmthTendency >= 0.5) return "warm-measured";
  return "neutral";
}

function expressionModeProjection(
  hard: HardConstraintSet,
  contract: BehaviorContract,
): KairaExpressionMode {
  if (hard.hardDisengage) {
    return contract.repairStatus === "incomplete" ? "natural_repair" : "firm_boundary";
  }
  if (hard.mustAcknowledgeBoundary) return "careful_repair";
  return "natural_social";
}

export function resolveKairaResponsePlan(input: ResolveKairaPlanInput): ResolvedKairaPlan {
  const { hard, soft, dialogue, speech, contract } = input;
  const rationale: string[] = [];

  const contractSemanticUncertainty = Number.isFinite(contract.semanticUncertainty)
    ? Number(contract.semanticUncertainty)
    : undefined;
  const uncertainty: KairaPlanUncertainty = {
    semantic: clamp01(input.uncertainty?.semantic ?? contractSemanticUncertainty ?? 0.4),
    relational: clamp01(input.uncertainty?.relational ?? 0.35),
  };
  const cautious = Math.max(uncertainty.semantic, uncertainty.relational);
  const damp = (n: number) => clamp01(n * (1 - 0.35 * cautious));

  const continueConversation = !hard.hardDisengage;

  const allowQuestion =
    hard.questionAllowed && dialogue.allowFollowUpQuestion && damp(soft.questionDrive) >= 0.3;

  const allowHumor = hard.humorAllowed;
  const allowAdvice = hard.adviceAllowed === true;

  const flirtationAllowed = hard.flirtingAllowed === true;
  const counterFlirtAllowed = hard.counterFlirtAllowed === true;
  if (!flirtationAllowed) rationale.push("flirtation:hard-forbidden (character policy)");
  if (!allowAdvice) rationale.push("advice:hard-forbidden (not requested)");

  const intimacyCeiling = clamp01(Math.min(hard.intimacyCeiling, soft.intimacyInclination));

  const allowAffection =
    hard.affectionAllowed && intimacyCeiling >= 0.3 && damp(soft.warmthTendency) >= 0.35;

  const allowForgiveness = hard.forgivenessAllowed && soft.opennessTendency >= 0.25;

  const allowReopeningCloseness =
    hard.reopeningClosenessAllowed &&
    soft.opennessTendency >= 0.35 &&
    soft.guardedness <= 0.7;

  const maxSentences =
    soft.verbosityTendency < 0.35 ? Math.max(1, Math.min(hard.maxSentences, 1)) : hard.maxSentences;
  const maxWords = hard.hardDisengage
    ? Math.max(4, hard.maxWords)
    : Math.max(
        1,
        Math.min(hard.maxWords, Math.round(hard.maxWords * (0.6 + 0.4 * soft.verbosityTendency))),
      );

  const emojiBudget =
    hard.emojiBudget > 0 && soft.warmthTendency >= 0.4 && !hard.mustAcknowledgeBoundary ? 1 : 0;

  let socialMove: KairaSocialMove = "none";
  if (dialogue.move === "respond_to_relational_bid") {
    if (hard.hardDisengage) socialMove = "maintain_boundary";
    else if (hard.mustAcknowledgeBoundary || contract.stance !== "open") socialMove = "set_boundary";
    else if (dialogue.relationalAct === "reconciliation_attempt" && allowReopeningCloseness) socialMove = "accept_repair";
    else if (allowAffection && dialogue.relationalAct === "closeness_bid") socialMove = "reciprocate_nonromantic_closeness";
    else socialMove = soft.guardedness >= 0.55 ? "set_boundary" : "warm_deflect";
    rationale.push(`social_move:${socialMove}`);
  }

  // WHAT only. These labels say which semantic obligations must be preserved;
  // they never prescribe a sentence shape, state narration, or turn-closing style.
  const requiredContent: string[] = [];
  if (hard.hardDisengage) requiredContent.push("boundary_maintained");
  else if (hard.mustAcknowledgeBoundary) requiredContent.push("boundary_acknowledged");
  if (dialogue.move === "acknowledge_correction") {
    requiredContent.push("own_previous_correction");
    rationale.push("self_correction:explicit-accountability-required");
  }
  if (!counterFlirtAllowed) requiredContent.push("no_counter_flirt");
  const preserveAmbiguity =
    dialogue.move === "natural_reaction" &&
    !dialogue.allowSpeculation &&
    uncertainty.semantic >= 0.75;
  if (socialMove !== "none") requiredContent.push(`social_move:${socialMove}`);
  if (preserveAmbiguity) {
    requiredContent.push("preserve_ambiguity");
    rationale.push("opaque_turn:preserve_ambiguity");
  }

  if (cautious >= 0.6) rationale.push(`uncertainty_damping applied (cautious=${cautious.toFixed(2)})`);
  rationale.push(...hard.reasons, ...soft.rationale);

  return {
    continueConversation,
    allowQuestion,
    allowHumor,
    allowAffection,
    allowAdvice,
    allowForgiveness,
    allowReopeningCloseness,
    flirtationAllowed,
    counterFlirtAllowed,
    maxSentences,
    maxWords,
    emojiBudget,
    opennessAxis: soft.opennessTendency,
    warmthAxis: soft.warmthTendency,
    guardedness: soft.guardedness,
    intimacyCeiling,
    requiredContent,
    hardReasons: hard.reasons,
    uncertainty,
    socialMove,
    projections: {
      toneProjection: toneProjection(soft, hard),
      register: speech.register,
      stance: contract.stance,
      relationshipLevel: speech.relationshipLevel,
      expressionMode: expressionModeProjection(hard, contract),
    },
    resolverRationale: rationale,
  };
}
