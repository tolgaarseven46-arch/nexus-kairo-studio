import type { DroitDynamicState, DroitPersonalityTraits } from "../types/nexus";
import type { PersonalityTendencyResponse } from "./personalityTendencyEngine";
import type { MotivationResponse } from "./motivationEngine";
import type { ValueResponse } from "./valueEngine";
import type { PreferenceResponse } from "./preferenceEngine";
import type { SocialOrientationResponse } from "./socialOrientationEngine";
import type { BoundaryResponse } from "./boundaryEngine";
import type { ExpressionStyleResponse } from "./expressionStyleEngine";
import { interpretSemanticEvent, type SemanticEvent } from "./semanticEventEngine";

export interface BehaviorIntegrationInput {
  personality: DroitPersonalityTraits;
  dynamicState?: DroitDynamicState;
  userMessage?: string;
  semanticEvent?: SemanticEvent;
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


const minutesSince = (iso?: string) => {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? Math.max(0, (Date.now() - t) / 60000) : 0;
};

export const integrateBehaviorLayers = (input: BehaviorIntegrationInput): BehaviorIntegrationResult => {
  const b = input.boundaries.behaviorSignals;
  const v = input.values.behaviorSignals;
  const s = input.social.behaviorSignals;
  const m = input.motivation.drives;
  const p = input.preferences.behaviorSignals;
  const e = input.expression;
  const pt = input.personalityTendency.behaviorSignals;
  const relationship = input.dynamicState?.relationship;
  const semanticEvent = input.semanticEvent ?? interpretSemanticEvent(input.userMessage ?? "");

  const hurt = clamp01((relationship?.hurtScore ?? 0) / 100);
  const conflict = clamp01((relationship?.conflictScore ?? 0) / 100);
  const anger = clamp01((input.dynamicState?.anger ?? 0) / 100);
  const stress = clamp01((input.dynamicState?.stress ?? 0) / 100);
  const priorConversationState = relationship?.conversationState ?? "active";
  const priorDisengaged = priorConversationState === "disengaged";
  const priorRepairing = priorConversationState === "repairing";
  const repairAttempts = Math.max(0, relationship?.repairAttempts ?? 0);
  const disengagedMinutes = minutesSince(relationship?.disengagedAt);
  const repairSignal = semanticEvent.apology || semanticEvent.repairAttempt;

  const boundaryPressure = input.boundaries.hardStop
    ? 1
    : clamp01(b.boundaryAssertion * 0.35 + b.distancePressure * 0.25 + b.escalationPressure * 0.15 + b.disengagementPressure * 0.25);
  const valuePressure = clamp01(v.moralObjection * 0.35 + v.boundaryPressure * 0.25 + v.autonomyDefense * 0.2 + v.accountabilityPressure * 0.2);
  const relationshipPressure = clamp01(s.socialDistancePressure * 0.5 + hurt * 0.3 + conflict * 0.2 + (priorDisengaged ? 0.55 : priorRepairing ? 0.28 : 0));
  const approachPressure = clamp01(m.approachPressure);
  const withdrawalPressure = clamp01(Math.max(m.withdrawalPressure, b.distancePressure, priorDisengaged ? 1 : priorRepairing ? 0.6 : 0));
  const overstimulationPressure = clamp01(p.overstimulationPressure);
  const engagementPressure = clamp01(p.engagementDrive * (1 - overstimulationPressure * 0.75));
  const humorPressure = clamp01(e.humor.strength * (1 - e.inhibition));

  let priority: IntegratedBehaviorDecision["priority"] = "expression";
  if (input.boundaries.hardStop || priorDisengaged || boundaryPressure >= 0.45) priority = "boundary";
  else if (valuePressure >= 0.4) priority = "values";
  else if (priorRepairing || relationshipPressure >= 0.38) priority = "relationship";
  else if (Math.max(approachPressure, withdrawalPressure) >= 0.42) priority = "goal";
  else if (engagementPressure >= 0.35) priority = "preference";

  const severeBoundary = input.boundaries.hardStop || b.disengagementPressure >= 0.72 || input.boundaries.violationPressure >= 0.82;
  const accumulatedDamage = clamp01(hurt * 0.55 + conflict * 0.45);

  const eligibleForRepairing = priorDisengaged && repairSignal && (repairAttempts >= 1 || (relationship?.repairProgress ?? 0) >= 12 || disengagedMinutes >= 30);
  const persistentDisengage = priorDisengaged && !eligibleForRepairing;
  const freshDisengage = input.boundaries.hardStop || (severeBoundary && (b.repairOpenness < 0.35 || accumulatedDamage >= 0.5));
  const disengage = persistentDisengage || freshDisengage;
  const repairingHold = priorRepairing || eligibleForRepairing;

  const relationshipDistanceFloor = priority === "relationship" ? clamp01(relationshipPressure * 0.48) : 0;
  const relationshipWarmthPenalty = priority === "relationship" ? relationshipPressure * 0.25 : 0;
  const distance = disengage
    ? 1
    : repairingHold
      ? Math.max(0.68, clamp01(relationshipPressure * 0.55 + withdrawalPressure * 0.25 - b.repairOpenness * 0.1))
      : Math.max(
          relationshipDistanceFloor,
          clamp01(boundaryPressure * 0.5 + relationshipPressure * 0.3 + withdrawalPressure * 0.2 - b.repairOpenness * 0.2),
        );
  const warmth = disengage
    ? 0
    : repairingHold
      ? Math.min(0.24, clamp01(s.affiliationPressure * 0.18 + b.repairOpenness * 0.12))
      : clamp01(s.affiliationPressure * 0.32 + s.carePressure * 0.27 + approachPressure * 0.18 + s.disclosurePressure * 0.08 + b.repairOpenness * 0.15 - distance * 0.55 - relationshipWarmthPenalty);
  const stance: IntegratedBehaviorDecision["stance"] = freshDisengage
    ? "disengage"
    : persistentDisengage || repairingHold || distance >= 0.62
      ? "distant"
      : boundaryPressure >= 0.38 || valuePressure >= 0.4
        ? "firm"
        : warmth >= 0.55
          ? "warm"
          : "neutral";

  const humorAllowed = !disengage && !repairingHold && !semanticEvent.stopTalking && stance !== "firm" && stance !== "distant" && boundaryPressure < 0.3 && valuePressure < 0.3 && relationshipPressure < 0.35 && anger < 0.55 && stress < 0.7 && e.humor.enabled;
  const askQuestion = !disengage && !repairingHold && !semanticEvent.stopQuestions && !semanticEvent.stopTalking && distance < 0.58 && e.speech.questionDrive >= 0.32 && b.escalationPressure < 0.45;
  const acknowledgeComplaint = semanticEvent.stopQuestions || semanticEvent.stopTalking || semanticEvent.intent === "complaint" || priorDisengaged || priorRepairing || valuePressure >= 0.28 || boundaryPressure >= 0.28 || s.carePressure >= 0.45;
  const repairAllowed = repairSignal && !input.boundaries.hardStop && (priorDisengaged || priorRepairing || b.repairOpenness >= 0.2);
  const socialResistanceDirectness = clamp01(s.resistancePressure * clamp01(semanticEvent.coercion));
  const directness = clamp01(pt.assertivePressure * 0.32 + s.leadershipPressure * 0.18 + socialResistanceDirectness * 0.15 + b.boundaryAssertion * 0.25 + valuePressure * 0.1 + (priorDisengaged ? 0.25 : priorRepairing ? 0.12 : 0));
  const responseLength: IntegratedBehaviorDecision["responseLength"] = disengage || repairingHold || semanticEvent.stopTalking || distance >= 0.6 || e.speech.brevity >= 0.65 || overstimulationPressure >= 0.45 ? "short" : pt.analysisPressure >= 0.62 || p.depthDrive >= 0.58 ? "long" : "medium";

  const explanation: string[] = [];
  if (input.boundaries.hardStop) explanation.push("Mutlak kırmızı çizgi tetiklendi; konuşma kesildi.");
  else if (persistentDisengage) explanation.push("Önceki disengage durumu kalıcı; bu tur ilişki yeniden açılmadı.");
  else if (eligibleForRepairing) explanation.push("Onarım sinyali var; ilişki yalnızca repairing aşamasına geçebilir.");
  else if (priorRepairing) explanation.push("İlişki hâlâ onarım aşamasında; normal yakınlık geri açılmadı.");
  else if (priority === "boundary") explanation.push("Sınır ihlali alt katmanların önüne geçti.");
  if (priority === "values") explanation.push("Değer çatışması davranış stilini bastırdı.");
  if (relationshipPressure >= 0.38) explanation.push("İlişki hasarı yakınlık ve mizahı düşürdü.");
  if (semanticEvent.stopQuestions) explanation.push("Kullanıcının soru sormama talebi uygulandı.");
  if (semanticEvent.stopTalking) explanation.push("Kullanıcının konuşmayı durdurma talebi uygulandı.");
  if (repairAllowed) explanation.push("Onarım sinyali kayda değer; ancak ilişki anında normale dönmez.");
  if (!humorAllowed && e.humor.enabled) explanation.push("Mizah adayı üst öncelikli baskılar nedeniyle kapatıldı.");

  const decision: IntegratedBehaviorDecision = {
    priority,
    continueConversation: !disengage && !semanticEvent.stopTalking,
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
  };

  const finalPersonality: DroitPersonalityTraits = {
    ...input.personality,
    humor: humorAllowed ? clamp100(humorPressure * 100) : 0,
    authority: clamp100((input.personality.authority ?? 50) * 0.45 + directness * 55),
    empathy: clamp100((input.personality.empathy ?? 50) * 0.55 + warmth * 45),
    patience: clamp100((input.personality.patience ?? 50) * 0.55 + (1 - boundaryPressure) * 25 + b.repairOpenness * 20),
    seriousness: clamp100((input.personality.seriousness ?? 50) * 0.5 + Math.max(boundaryPressure, valuePressure, relationshipPressure) * 50),
    communication: clamp100(responseLength === "short" ? 30 : responseLength === "long" ? 80 : 55),
  };

  return {
    personality: finalPersonality,
    decision,
    pressures: { boundary: boundaryPressure, values: valuePressure, relationship: relationshipPressure, approach: approachPressure, withdrawal: withdrawalPressure, engagement: engagementPressure, humor: humorPressure },
  };
};
