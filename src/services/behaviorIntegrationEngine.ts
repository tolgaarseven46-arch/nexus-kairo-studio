import type { DroitDynamicState, DroitPersonalityTraits } from "../types/nexus";
import type { PersonalityTendencyResponse } from "./personalityTendencyEngine";
import type { MotivationResponse } from "./motivationEngine";
import type { ValueResponse } from "./valueEngine";
import type { PreferenceResponse } from "./preferenceEngine";
import type { SocialOrientationResponse } from "./socialOrientationEngine";
import type { BoundaryResponse } from "./boundaryEngine";
import type { ExpressionStyleResponse } from "./expressionStyleEngine";

export interface BehaviorIntegrationInput {
  personality: DroitPersonalityTraits;
  dynamicState?: DroitDynamicState;
  personalityTendency: PersonalityTendencyResponse;
  motivation: MotivationResponse;
  values: ValueResponse;
  preferences: PreferenceResponse;
  social: SocialOrientationResponse;
  boundaries: BoundaryResponse;
  expression: ExpressionStyleResponse;
}

export interface IntegratedBehaviorDecision {
  priority: "boundary" | "values" | "relationship" | "goal" | "preference" | "expression";
  continueConversation: boolean;
  humorAllowed: boolean;
  askQuestion: boolean;
  acknowledgeComplaint: boolean;
  repairAllowed: boolean;
  stance: "warm" | "neutral" | "firm" | "distant" | "disengage";
  responseLength: "short" | "medium" | "long";
  directness: number;
  warmth: number;
  distance: number;
  explanation: string[];
}

export interface BehaviorIntegrationResult {
  personality: DroitPersonalityTraits;
  decision: IntegratedBehaviorDecision;
  pressures: {
    boundary: number;
    values: number;
    relationship: number;
    approach: number;
    withdrawal: number;
    engagement: number;
    humor: number;
  };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const clamp100 = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/**
 * Cross-layer arbitration policy.
 * This is an explicit engineering hierarchy, not a claim that human cognition
 * uses one fixed global ordering. It prevents later style/preferences from
 * accidentally overriding boundaries, value conflicts, or relationship damage.
 */
export const integrateBehaviorLayers = (
  input: BehaviorIntegrationInput,
): BehaviorIntegrationResult => {
  const b = input.boundaries.behaviorSignals;
  const v = input.values.behaviorSignals;
  const s = input.social.behaviorSignals;
  const m = input.motivation.drives;
  const p = input.preferences.behaviorSignals;
  const e = input.expression;
  const pt = input.personalityTendency.behaviorSignals;
  const relationship = input.dynamicState?.relationship;

  const hurt = clamp01((relationship?.hurtScore ?? 0) / 100);
  const conflict = clamp01((relationship?.conflictScore ?? 0) / 100);
  const anger = clamp01((input.dynamicState?.anger ?? 0) / 100);
  const stress = clamp01((input.dynamicState?.stress ?? 0) / 100);

  const boundaryPressure = clamp01(
    b.boundaryAssertion * 0.35 +
      b.distancePressure * 0.25 +
      b.escalationPressure * 0.15 +
      b.disengagementPressure * 0.25,
  );
  const valuePressure = clamp01(
    v.moralObjection * 0.35 +
      v.boundaryPressure * 0.25 +
      v.autonomyDefense * 0.2 +
      v.accountabilityPressure * 0.2,
  );
  const relationshipPressure = clamp01(
    s.socialDistancePressure * 0.5 + hurt * 0.3 + conflict * 0.2,
  );
  const approachPressure = clamp01(
    m.drives?.approachPressure ?? m.approachPressure ?? 0,
  );
  const withdrawalPressure = clamp01(
    Math.max(m.drives?.withdrawalPressure ?? m.withdrawalPressure ?? 0, b.distancePressure),
  );
  const engagementPressure = clamp01(p.engagementDrive);
  const humorPressure = clamp01(e.humor.strength * (1 - e.inhibition));

  let priority: IntegratedBehaviorDecision["priority"] = "expression";
  if (boundaryPressure >= 0.45) priority = "boundary";
  else if (valuePressure >= 0.4) priority = "values";
  else if (relationshipPressure >= 0.38) priority = "relationship";
  else if (Math.max(approachPressure, withdrawalPressure) >= 0.42) priority = "goal";
  else if (engagementPressure >= 0.35) priority = "preference";

  const severeBoundary = b.disengagementPressure >= 0.72 || input.boundaries.violationPressure >= 0.82;
  const accumulatedDamage = clamp01(hurt * 0.55 + conflict * 0.45);
  const disengage = severeBoundary && (b.repairOpenness < 0.35 || accumulatedDamage >= 0.5);

  const distance = clamp01(
    boundaryPressure * 0.5 + relationshipPressure * 0.3 + withdrawalPressure * 0.2 - b.repairOpenness * 0.2,
  );
  const warmth = clamp01(
    s.affiliationPressure * 0.35 + s.carePressure * 0.3 + approachPressure * 0.2 + b.repairOpenness * 0.15 - distance * 0.55,
  );

  const stance: IntegratedBehaviorDecision["stance"] = disengage
    ? "disengage"
    : distance >= 0.62
      ? "distant"
      : boundaryPressure >= 0.38 || valuePressure >= 0.4
        ? "firm"
        : warmth >= 0.55
          ? "warm"
          : "neutral";

  const humorAllowed =
    !disengage &&
    stance !== "firm" &&
    stance !== "distant" &&
    boundaryPressure < 0.3 &&
    valuePressure < 0.3 &&
    relationshipPressure < 0.35 &&
    anger < 0.55 &&
    stress < 0.7 &&
    e.humor.enabled;

  const askQuestion =
    !disengage &&
    distance < 0.58 &&
    e.speech.questionDrive >= 0.32 &&
    b.escalationPressure < 0.45;

  const acknowledgeComplaint =
    valuePressure >= 0.28 || boundaryPressure >= 0.28 || s.carePressure >= 0.45;

  const repairAllowed = b.repairOpenness >= 0.2 && !severeBoundary;

  const directness = clamp01(
    pt.assertivePressure * 0.35 +
      s.leadershipPressure * 0.2 +
      b.boundaryAssertion * 0.3 +
      valuePressure * 0.15,
  );

  const responseLength: IntegratedBehaviorDecision["responseLength"] =
    disengage || distance >= 0.6 || e.speech.brevity >= 0.65
      ? "short"
      : pt.analysisPressure >= 0.62 || p.depthDrive >= 0.58
        ? "long"
        : "medium";

  const explanation: string[] = [];
  if (priority === "boundary") explanation.push("Sınır ihlali alt katmanların önüne geçti.");
  if (priority === "values") explanation.push("Değer çatışması davranış stilini bastırdı.");
  if (relationshipPressure >= 0.38) explanation.push("İlişki hasarı yakınlık ve mizahı düşürdü.");
  if (repairAllowed) explanation.push("Onarım sinyali kontrollü yakınlaşmaya izin verdi.");
  if (!humorAllowed && e.humor.enabled) explanation.push("Mizah adayı üst öncelikli baskılar nedeniyle kapatıldı.");

  const finalPersonality: DroitPersonalityTraits = {
    ...input.personality,
    humor: humorAllowed ? clamp100(humorPressure * 100) : 0,
    authority: clamp100(
      (input.personality.authority ?? 50) * 0.45 + directness * 55,
    ),
    empathy: clamp100(
      (input.personality.empathy ?? 50) * 0.55 + warmth * 45,
    ),
    patience: clamp100(
      (input.personality.patience ?? 50) * 0.55 + (1 - boundaryPressure) * 25 + b.repairOpenness * 20,
    ),
    seriousness: clamp100(
      (input.personality.seriousness ?? 50) * 0.5 +
        Math.max(boundaryPressure, valuePressure, relationshipPressure) * 50,
    ),
    communication: clamp100(
      responseLength === "short" ? 30 : responseLength === "long" ? 80 : 55,
    ),
  };

  return {
    personality: finalPersonality,
    decision: {
      priority,
      continueConversation: !disengage,
      humorAllowed,
      askQuestion,
      acknowledgeComplaint,
      repairAllowed,
      stance,
      responseLength,
      directness,
      warmth,
      distance,
      explanation,
    },
    pressures: {
      boundary: boundaryPressure,
      values: valuePressure,
      relationship: relationshipPressure,
      approach: approachPressure,
      withdrawal: withdrawalPressure,
      engagement: engagementPressure,
      humor: humorPressure,
    },
  };
};
