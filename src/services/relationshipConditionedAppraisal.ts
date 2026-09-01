import type { AffectiveReactionMode, ConversationRelationshipState } from "../types/nexus";

export interface RelationshipConditionedAppraisalInput {
  event: {
    kind: "positive" | "negative" | "neutral";
    targetsKaira: boolean;
    redLine: boolean;
    repairSignal: boolean;
  };
  relationship: {
    closeness: number;
    familiarityDays: number;
    interactionCount: number;
    warmth: number;
    trust: number;
    relationshipQuality: number;
    conflict: number;
    hurt: number;
    repairProgress: number;
    priorConversationState: ConversationRelationshipState;
    conversationState: ConversationRelationshipState;
  };
  internalState: {
    anger: number;
    stress: number;
    calmness: number;
    priorReactionMode?: AffectiveReactionMode;
  };
  modulation: {
    repeatEscalation: number;
    personalityImpact: number;
    negativeSensitivity: number;
    angerTrait: number;
    toleranceMultiplier: number;
    forgivenessFactor: number;
  };
}

export interface RelationshipConditionedAppraisal {
  attachmentSalience: number;
  accumulatedInjury: number;
  arousalPressure: number;
  repairReadiness: number;
  establishedRelationship: boolean;
  priorRelationshipDamaged: boolean;
  reactionTendency: AffectiveReactionMode;
  emotionDelta: {
    stress: number;
    happiness: number;
    calmness: number;
    anger: number;
  };
  rationale: string[];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const round3 = (v: number) => Math.round(v * 1000) / 1000;
const towardBaseline = (value: number, baseline: number, maxStep = 1) =>
  value === baseline ? 0 : value > baseline ? -Math.min(maxStep, value - baseline) : Math.min(maxStep, baseline - value);

export function appraiseRelationshipConditionedEvent(
  input: RelationshipConditionedAppraisalInput,
): RelationshipConditionedAppraisal {
  const r = input.relationship;
  const i = input.internalState;
  const attachmentSalience = round3(clamp01(
    clamp01(r.closeness / 100) * 0.42 +
    clamp01(r.trust / 100) * 0.24 +
    clamp01(r.relationshipQuality / 100) * 0.20 +
    clamp01(r.warmth / 100) * 0.14,
  ));
  const accumulatedInjury = round3(clamp01(
    clamp01(r.hurt / 100) * 0.52 +
    clamp01(r.conflict / 100) * 0.33 +
    (r.conversationState === "active" ? 0 : r.conversationState === "distancing" ? 0.08 : 0.15),
  ));
  const arousalPressure = round3(clamp01(
    clamp01(i.anger / 100) * 0.42 +
    clamp01(i.stress / 100) * 0.33 +
    (1 - clamp01(i.calmness / 100)) * 0.25,
  ));
  const repairReadiness = round3(clamp01(
    clamp01(r.repairProgress / 100) * 0.45 +
    clamp01(r.trust / 100) * 0.25 +
    attachmentSalience * 0.30,
  ));
  const establishedRelationship = r.familiarityDays >= 14 || r.interactionCount >= 20;
  const priorRelationshipDamaged =
    r.priorConversationState !== "active" || r.hurt >= 20 || r.conflict >= 20;
  const rationale = [];

  let reactionTendency: AffectiveReactionMode = "neutral";
  if (r.conversationState === "disengaged" || input.event.redLine) {
    reactionTendency = "withdrawn";
    rationale.push("hard-stop-or-disengaged");
  } else if (r.conversationState === "repairing" || (input.event.repairSignal && accumulatedInjury >= 0.08)) {
    reactionTendency = "repairing";
    rationale.push("active-repair-with-residual-injury");
  } else if (input.event.kind === "negative" && input.event.targetsKaira) {
    if (priorRelationshipDamaged || r.conversationState === "distancing" || accumulatedInjury >= 0.30) {
      reactionTendency = "withdrawn";
      rationale.push("negative-event-on-damaged-relationship");
    } else if (attachmentSalience >= 0.56 && establishedRelationship) {
      reactionTendency = "hurt";
      rationale.push("negative-event-high-attachment");
    } else if (arousalPressure >= 0.78 && accumulatedInjury >= 0.16) {
      reactionTendency = "withdrawn";
      rationale.push("negative-event-high-arousal-and-injury");
    } else {
      reactionTendency = "irritated";
      rationale.push("negative-event-low-attachment");
    }
  } else if (input.event.kind === "neutral" && !input.event.repairSignal) {
    const prior = input.internalState.priorReactionMode;
    if ((prior === "hurt" || prior === "irritated") && (r.hurt >= 2 || r.conflict >= 2)) {
      reactionTendency = prior;
      rationale.push("residual-reaction-persistence");
    } else if (accumulatedInjury >= 0.18) {
      reactionTendency = "hurt";
      rationale.push("residual-injury");
    }
  } else if (accumulatedInjury >= 0.18) {
    reactionTendency = "hurt";
    rationale.push("positive-or-neutral-event-with-unresolved-injury");
  }

  const m = input.modulation;
  const neutral = {
    stress: towardBaseline(i.stress, 20, 1),
    happiness: 0,
    calmness: towardBaseline(i.calmness, 70, 1),
    anger: towardBaseline(i.anger, 10, 1),
  };
  const impact = Math.max(0.25, m.repeatEscalation * m.personalityImpact * m.toleranceMultiplier);
  const angerImpact = Math.max(1, (2 + m.angerTrait / 50) * m.repeatEscalation * m.negativeSensitivity);

  let emotionDelta = neutral;
  if (reactionTendency === "irritated") {
    emotionDelta = {
      stress: Math.max(2, Math.round(3.5 * impact)),
      happiness: Math.min(-1, Math.round(-2 * impact)),
      calmness: Math.min(-2, Math.round(-2.5 * impact)),
      anger: Math.max(2, Math.round(angerImpact)),
    };
  } else if (reactionTendency === "hurt") {
    emotionDelta = {
      stress: Math.max(2, Math.round(4.5 * impact)),
      happiness: Math.min(-3, Math.round(-4 * impact)),
      calmness: Math.min(-2, Math.round(-2 * impact)),
      anger: Math.max(0, Math.round(angerImpact * 0.45)),
    };
  } else if (reactionTendency === "withdrawn") {
    emotionDelta = {
      stress: Math.max(2, Math.round(3.5 * impact)),
      happiness: Math.min(-2, Math.round(-3 * impact)),
      calmness: Math.min(-1, Math.round(-1.5 * impact)),
      anger: Math.max(0, Math.round(angerImpact * 0.25)),
    };
  } else if (reactionTendency === "repairing") {
    emotionDelta = {
      stress: accumulatedInjury >= 0.18 ? -1 : towardBaseline(i.stress, 20, 1),
      happiness: accumulatedInjury >= 0.18 ? 0 : 1,
      calmness: 1,
      anger: -Math.min(2, Math.max(0, i.anger - 10)),
    };
  } else if (input.event.kind === "positive") {
    emotionDelta = { stress: -1, happiness: 2, calmness: 1, anger: towardBaseline(i.anger, 10, 1) };
  }

  return {
    attachmentSalience,
    accumulatedInjury,
    arousalPressure,
    repairReadiness,
    establishedRelationship,
    priorRelationshipDamaged,
    reactionTendency,
    emotionDelta,
    rationale,
  };
}
