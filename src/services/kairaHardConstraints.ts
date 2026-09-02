/**
 * HardConstraintSet derivation (ADR-0006, PR2).
 *
 * The deontic layer. It answers only "what is forbidden / mandatory this turn",
 * from two sources that relationship dynamics cannot move:
 *   - character policy (config/kaira-character-policy.json)
 *   - the already-resolved BehaviorContract's hard facts (disengaged, forbidden
 *     permissions, repair obligations, length ceilings)
 *
 * Everything graded lives in SoftTendencyProfile. A `false` gate here is
 * absolute — no soft tendency may reopen it.
 */

import type { BehaviorContract } from "./behaviorContract";
import type { DialogueDecisionPlan } from "./kairoDialogueDecisionEngine";
import type { HardConstraintSet, KairaCharacterPolicy } from "../types/kairaBehaviorPlan";

export const DEFAULT_KAIRA_CHARACTER_POLICY: KairaCharacterPolicy = {
  // Product decision: Kaira does not reciprocate flirtation as a rule. This is a
  // HARD boundary — no soft tendency, trust, warmth, intimacy inclination,
  // prior relationship state or chosenTone may re-open it.
  flirtingAllowed: false,
  acceptsSlurBanter: true,
  epistemicHonesty: true,
  maxIntimacy: 0.85,
  hardDisengageReasons: [
    "user_stop",
    "combined_boundary_violation",
    "severe_single_turn_violation",
    "repeated_boundary_violation",
  ],
};

/**
 * Intimacy ceiling when `flirtingAllowed` is false. Held below the resolver's
 * `allowAffection` threshold (0.3) so romantic-physical endearments ("öp",
 * "aşkım", "sevgilim") are gated too — plain warmth ("iyi ki varsın") is not in
 * that gate and stays available. No soft inclination can raise this.
 */
export const NON_ROMANTIC_INTIMACY_CEILING = 0.25;

const BOUNDARY_REASON_RE =
  /(disengage|boundary|red[_-]?line|ihlal|sınır|user_stop|stop)/i;

export function deriveHardConstraints(
  contract: BehaviorContract,
  dialogue: DialogueDecisionPlan,
  policy: KairaCharacterPolicy = DEFAULT_KAIRA_CHARACTER_POLICY,
): HardConstraintSet {
  const reasons: string[] = [];

  // Hard stop keys off the contract's explicit "do not continue" decision, NOT
  // off the conversationState label directly (K2): an FSM that drifts to
  // "disengaged" while still permitting continuation is handled by the soft
  // layer, not vetoed here.
  const hardDisengage = contract.continueConversation === false;
  const hardDisengageReason = hardDisengage
    ? contract.reasons.find((r) => BOUNDARY_REASON_RE.test(r)) ?? "boundary_or_safety_stop"
    : null;
  if (hardDisengage) reasons.push(`hard_disengage:${hardDisengageReason}`);

  const mustAcknowledgeBoundary =
    !hardDisengage &&
    (contract.stance === "repairing-cautious" ||
      contract.repairStatus === "incomplete" ||
      contract.repairStatus === "repairing");
  if (mustAcknowledgeBoundary) reasons.push("must_acknowledge_boundary");

  // Permission vetoes: "forbidden" is a hard NO; "allowed" defers to the soft layer.
  const questionAllowed = !hardDisengage && contract.questions === "allowed";
  const humorAllowed = !hardDisengage && contract.playfulness === "allowed";
  const affectionAllowed = !hardDisengage && contract.affection === "allowed";
  const forgivenessAllowed = contract.forgivenessGranted && !hardDisengage;
  const reopeningClosenessAllowed =
    !hardDisengage && contract.reopeningCloseness === "allowed";

  // Length ceilings mirror the legacy contract/dialogue clamp.
  const contractSentences = contract.maxResponseLength === "short" ? 1 : 2;
  const maxSentences = Math.max(1, Math.min(dialogue.maxSentences, contractSentences));
  const contractWords = contract.maxResponseLength === "short" ? 14 : 32;
  const maxWords = Math.max(1, Math.min(dialogue.maxWords ?? contractWords, contractWords));
  // Emoji ceiling: only an open stance permits any; soft layer may still zero it.
  const emojiBudget = !hardDisengage && contract.stance === "open" ? 1 : 0;

  // Flirtation is gated ONLY by character policy. If the policy forbids it there
  // is no path — soft tendency, trust, warmth, intimacy inclination, prior state
  // or chosenTone — that can set it true.
  const flirtingAllowed = policy.flirtingAllowed === true && !hardDisengage;
  const intimacyCeiling = hardDisengage
    ? 0
    : flirtingAllowed
      ? Math.max(0, Math.min(1, policy.maxIntimacy))
      : NON_ROMANTIC_INTIMACY_CEILING;
  if (!policy.flirtingAllowed) reasons.push("flirtation_forbidden_by_character_policy");

  return {
    hardDisengage,
    hardDisengageReason,
    mustAcknowledgeBoundary,
    flirtingAllowed,
    counterFlirtAllowed: flirtingAllowed,
    acceptsSlurBanter: policy.acceptsSlurBanter,
    epistemicHonesty: policy.epistemicHonesty,
    intimacyCeiling,
    questionAllowed,
    humorAllowed,
    affectionAllowed,
    forgivenessAllowed,
    reopeningClosenessAllowed,
    maxSentences,
    maxWords,
    emojiBudget,
    reasons,
  };
}
