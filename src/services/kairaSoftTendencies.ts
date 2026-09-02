/**
 * SoftTendencyProfile derivation (ADR-0006, PR2).
 *
 * The graded, relationship-conditioned layer. It expresses how strongly Kaira
 * leans toward a behavior this turn, never whether it is allowed (that is the
 * hard layer). Openness / warmth / guardedness are ORTHOGONAL axes (K2): a
 * repairing turn can be warm and guarded at the same time, and a non-hard
 * "disengaged" conversationState damps openness but does not zero it — soft
 * tendencies still modulate.
 */

import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { KairoSpeechIdentity } from "./kairoSpeechIdentity";
import type { SoftTendencyProfile } from "../types/kairaBehaviorPlan";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const STANCE_OPENNESS: Record<BehaviorContract["stance"], number> = {
  open: 0.8,
  "distant-responsive": 0.45,
  "repairing-cautious": 0.3,
  closed: 0.12,
};

// conversationState is ONE input, not the determinant: it scales, never gates.
const STATE_OPENNESS_SCALE: Record<BehaviorContract["conversationState"], number> = {
  active: 1,
  repairing: 0.85,
  distancing: 0.8,
  disengaged: 0.5,
};

const RELATIONSHIP_WARMTH: Record<KairoSpeechIdentity["relationshipLevel"], number> = {
  new: 0.38,
  familiar: 0.6,
  close: 0.8,
};

const DIALOGUE_FOCUSED_MOVES = new Set<DialogueDecisionPlan["move"]>([
  "grounded_recall",
  "invite_emotional_context",
  "repair_or_rephrase",
  "follow_previous_answer",
  "acknowledge_correction",
]);

export function deriveSoftTendencies(
  contract: BehaviorContract,
  speech: KairoSpeechIdentity,
  dialogue: DialogueDecisionPlan,
): SoftTendencyProfile {
  const rationale: string[] = [];
  const dialogueFocused = DIALOGUE_FOCUSED_MOVES.has(dialogue.move);

  const opennessTendency = clamp01(
    STANCE_OPENNESS[contract.stance] * STATE_OPENNESS_SCALE[contract.conversationState],
  );
  rationale.push(
    `openness=${opennessTendency.toFixed(2)} (stance=${contract.stance}, state=${contract.conversationState})`,
  );

  const relWarmth = RELATIONSHIP_WARMTH[speech.relationshipLevel];
  const speechWarmth = clamp01(Number(speech.warmthLevel ?? 0.5));
  const warmthTendency = clamp01(
    0.5 * relWarmth + 0.3 * speechWarmth + 0.2 * STANCE_OPENNESS[contract.stance],
  );

  // Orthogonal to openness: repair obligation and cautious stance raise guard
  // even when warmth stays high.
  let guardedness = clamp01(1 - opennessTendency);
  if (contract.stance === "repairing-cautious") guardedness = clamp01(guardedness + 0.2);
  if (contract.repairStatus === "incomplete") guardedness = clamp01(guardedness + 0.12);
  if (speech.relationshipLevel === "close") guardedness = clamp01(guardedness - 0.1);
  rationale.push(`guardedness=${guardedness.toFixed(2)} (orthogonal to openness)`);

  const humorInclination = clamp01(
    clamp01(Number(speech.humorLevel ?? 0.4)) *
      (contract.playfulness === "allowed" ? 1 : 0.2) *
      (dialogueFocused ? 0.3 : 1),
  );

  const questionDrive = clamp01(
    (contract.questions === "allowed" ? 0.55 : 0.12) *
      (dialogue.allowFollowUpQuestion ? 1 : 0.4) +
      0.2 * opennessTendency,
  );

  const intimacyInclination = clamp01(
    0.55 * warmthTendency +
      0.25 * relWarmth +
      0.2 * (contract.affection === "allowed" ? 1 : 0.3) -
      (dialogueFocused ? 0.15 : 0),
  );

  const verbosityTendency = clamp01(
    (contract.maxResponseLength === "short" ? 0.28 : 0.55) + 0.15 * opennessTendency,
  );

  return {
    opennessTendency,
    warmthTendency,
    guardedness,
    humorInclination,
    questionDrive,
    intimacyInclination,
    verbosityTendency,
    rationale,
  };
}
