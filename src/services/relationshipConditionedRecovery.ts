import type { AffectiveReactionMode, ConversationRelationshipState } from "../types/nexus";
import { DEFAULT_TEMPERAMENT_PROFILE, temperamentRecoveryFactor, type TemperamentProfile } from "./temperamentEngine";

export interface RelationshipConditionedRecoveryInput {
  elapsedMinutes: number;
  reactionMode?: AffectiveReactionMode;
  state: { anger: number; stress: number; happiness: number; calmness: number };
  relationship: {
    hurt: number;
    conflict: number;
    repairProgress: number;
    conversationState: ConversationRelationshipState;
  };
  repairSignal: boolean;
  temperament?: TemperamentProfile;
}

export interface RelationshipConditionedRecoveryResult {
  state: { anger: number; stress: number; happiness: number; calmness: number };
  reactionMode: AffectiveReactionMode;
  decayFactor: number;
  rationale: string[];
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));
const retainAboveBaseline = (value: number, baseline: number, retention: number) =>
  value <= baseline ? value : baseline + (value - baseline) * retention;
const retainBelowBaseline = (value: number, baseline: number, retention: number) =>
  value >= baseline ? value : baseline - (baseline - value) * retention;

export function recoverRelationshipConditionedState(
  input: RelationshipConditionedRecoveryInput,
): RelationshipConditionedRecoveryResult {
  const elapsed = Math.max(0, input.elapsedMinutes);
  const reaction = input.reactionMode ?? "neutral";
  if (elapsed < 1) {
    return { state: { ...input.state }, reactionMode: reaction, decayFactor: 1, rationale: ["no-elapsed-time"] };
  }

  const temperament = input.temperament ?? DEFAULT_TEMPERAMENT_PROFILE;
  const base = temperamentRecoveryFactor(temperament, elapsed);
  const injury = Math.max(input.relationship.hurt, input.relationship.conflict);
  const repairBoost = input.repairSignal
    ? Math.min(0.45, 0.12 + input.relationship.repairProgress / 250)
    : 0;
  const rationale: string[] = [];

  let angerRetention = Math.pow(base, 1.2);
  let stressRetention = base;
  let happinessRetention = base;
  let calmnessRetention = base;
  let nextReaction: AffectiveReactionMode = reaction;

  if (reaction === "irritated") {
    angerRetention = Math.pow(base, 1.65);
    stressRetention = Math.pow(base, 1.25);
    happinessRetention = Math.pow(base, 1.15);
    calmnessRetention = Math.pow(base, 1.3);
    rationale.push("irritation-decays-fast");
  } else if (reaction === "hurt") {
    angerRetention = Math.pow(base, 1.4);
    stressRetention = Math.pow(base, 0.58);
    happinessRetention = Math.pow(base, 0.5);
    calmnessRetention = Math.pow(base, 0.72);
    rationale.push("hurt-retains-negative-affect");
  } else if (reaction === "withdrawn") {
    angerRetention = Math.pow(base, 1.55);
    const persistenceExponent = input.repairSignal ? 0.72 + repairBoost : 0.3;
    stressRetention = Math.pow(base, persistenceExponent);
    happinessRetention = Math.pow(base, persistenceExponent);
    calmnessRetention = Math.pow(base, persistenceExponent);
    rationale.push(input.repairSignal ? "withdrawal-recovery-with-repair" : "withdrawal-persists-without-repair");
  } else if (reaction === "repairing") {
    const exponent = 1.45 + repairBoost;
    angerRetention = Math.pow(base, exponent + 0.2);
    stressRetention = Math.pow(base, exponent);
    happinessRetention = Math.pow(base, exponent);
    calmnessRetention = Math.pow(base, exponent);
    rationale.push("repairing-accelerates-recovery");
  } else {
    rationale.push("neutral-baseline-recovery");
  }

  const state = {
    anger: clamp(retainAboveBaseline(input.state.anger, 10, angerRetention)),
    stress: clamp(retainAboveBaseline(input.state.stress, 20, stressRetention)),
    happiness: clamp(retainBelowBaseline(input.state.happiness, 70, happinessRetention)),
    calmness: clamp(retainBelowBaseline(input.state.calmness, 70, calmnessRetention)),
  };

  if (reaction === "irritated" && state.anger <= 14 && state.stress <= 24) {
    nextReaction = injury >= 20 ? "hurt" : "neutral";
    rationale.push("irritation-resolved");
  } else if (reaction === "hurt" && injury < 2 && state.stress <= 25) {
    nextReaction = "neutral";
    rationale.push("hurt-resolved-after-injury-drop");
  } else if (reaction === "withdrawn") {
    const canLeaveWithdrawal = input.repairSignal && input.relationship.repairProgress >= 35 && injury < 20;
    if (canLeaveWithdrawal) {
      nextReaction = "repairing";
      rationale.push("withdrawal-opens-to-repair");
    }
  } else if (reaction === "repairing" && input.relationship.conversationState === "active" && injury < 10) {
    nextReaction = "neutral";
    rationale.push("repair-complete");
  }

  return { state, reactionMode: nextReaction, decayFactor: base, rationale };
}
