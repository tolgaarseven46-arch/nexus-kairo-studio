import { describe, expect, it } from "vitest";
import type { DroitDynamicState, DroitPersonalityTraits, ReasoningTrace } from "../types/nexus";
import type { SocialAppraisalInput } from "../types/socialAppraisal";
import { buildBehaviorContract } from "./behaviorContract";
import { computeKairoSpeechIdentity } from "./kairoSpeechIdentity";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { resolveSocialAppraisalG4 } from "./socialAppraisalContextModulation";

const personality: DroitPersonalityTraits = {
  anger: 50, patience: 50, empathy: 50, emotionalSensitivity: 50,
  socialIntelligence: 50, selfConfidence: 50, humor: 50, communication: 50,
  charisma: 50, curiosity: 50, analyticalThinking: 50, creativity: 50,
  decisionMaking: 50, attention: 50, authority: 50, courage: 50,
  seriousness: 50, loyalty: 50, initiative: 50,
};

const negativeTurn = normalizeSemanticInterpretation({
  primaryIntent: "complaint", secondarySocialActs: [], target: "kaira", valence: "negative",
  severity: { disrespect: 0.45, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.1 },
  jokingConfidence: 0, sincerityConfidence: 0.9, affection: 0, support: 0, compliment: 0,
  emotionalLoad: 0.35, apology: false, repairAttempt: false,
  uncertainty: { overall: 0.1, intent: 0.05, target: 0.05, severity: 0.1 }, evidence: [],
});

const repairTurn = normalizeSemanticInterpretation({
  primaryIntent: "apology", secondarySocialActs: ["apology"], target: "kaira", valence: "positive",
  severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
  jokingConfidence: 0, sincerityConfidence: 0.95, affection: 0, support: 0.2, compliment: 0,
  emotionalLoad: 0.25, apology: true, repairAttempt: true,
  uncertainty: { overall: 0.05, intent: 0.05, target: 0.05, severity: 0.05 }, evidence: [],
});

const seriousShare = normalizeSemanticInterpretation({
  primaryIntent: "emotional_share", secondarySocialActs: [], target: "self", valence: "negative",
  severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
  jokingConfidence: 0, sincerityConfidence: 0.98, affection: 0, support: 0, compliment: 0,
  emotionalLoad: 1, apology: false, repairAttempt: false,
  uncertainty: { overall: 0.02, intent: 0.02, target: 0.02, severity: 0.02 }, evidence: [],
});

type Mode = "irritated" | "hurt" | "withdrawn" | "repairing";
type Affect = "stress" | "anger" | "happiness" | "calmness";

const affect = {
  stress: { anger: 10, stress: 95, happiness: 55, calmness: 20 },
  anger: { anger: 95, stress: 45, happiness: 45, calmness: 10 },
  happiness: { anger: 5, stress: 10, happiness: 100, calmness: 75 },
  calmness: { anger: 5, stress: 10, happiness: 70, calmness: 100 },
} as const;

const mode = {
  irritated: { cs: "active", warmth: 50, trust: 50, hurt: 8, conflict: 8, repair: 0, attempts: 0 },
  hurt: { cs: "distancing", warmth: 65, trust: 62, hurt: 24, conflict: 18, repair: 0, attempts: 0 },
  withdrawn: { cs: "disengaged", warmth: 35, trust: 30, hurt: 45, conflict: 40, repair: 0, attempts: 0 },
  repairing: { cs: "repairing", warmth: 45, trust: 40, hurt: 25, conflict: 20, repair: 45, attempts: 1 },
} as const;

function state(a: Affect, m: Mode): DroitDynamicState {
  const f = mode[m];
  return {
    ...affect[a], confidence: 70, surprise: 10, lastStatus: `${a}-${m}`, reactionMode: m,
    relationship: {
      warmth: f.warmth, warmthScore: f.warmth, trust: f.trust, trustScore: f.trust,
      hurtScore: f.hurt, conflictScore: f.conflict, repairProgress: f.repair, repairAttempts: f.attempts,
      conversationState: f.cs, interactionCount: 20, familiarityDays: 10, toleranceMultiplier: 1,
    },
  };
}

function trace(a: Affect, m: Mode, sentiment: "negatif" | "pozitif"): ReasoningTrace {
  const s = state(a, m); const r = s.relationship!;
  return {
    whoSent: { userName: "user", isNewUser: false, recognitionText: "known" },
    relationship: { warmthScore: r.warmth ?? 50, warmthLabel: "test", note: "cross-axis", familiarityDays: 10,
      interactionCount: 20, trustScore: r.trust, conflictScore: r.conflictScore, hurtScore: r.hurtScore,
      repairProgress: r.repairProgress, conversationState: r.conversationState, repairAttempts: r.repairAttempts },
    currentMood: { moodText: a, reasonText: "fixture", reactionMode: m },
    messageInterpretation: { intent: "fixture", sentiment, explanation: "cross-axis" },
    decision: { chosenTone: "test", explanation: "cross-axis" },
    memoryUpdate: { warmthBefore: r.warmth ?? 50, warmthAfter: r.warmth ?? 50, warmthDelta: 0, moodChange: "none", reason: "cross-axis" },
  };
}

function resolve(a: Affect, m: Mode, semantic: typeof negativeTurn | typeof repairTurn | typeof seriousShare) {
  const s = state(a, m);
  const input: SocialAppraisalInput = { semantic, relationship: s.relationship!, currentState: s, personality };
  return resolveSocialAppraisalG4(input, "active-interlocutor");
}

const cases = [
  ["stress", "repairing", negativeTurn, "negatif", "balanced", "repairing-cautious"],
  ["anger", "hurt", negativeTurn, "negatif", "hurt", "distant-responsive"],
  ["happiness", "hurt", repairTurn, "pozitif", "hurt", "distant-responsive"],
  ["calmness", "withdrawn", repairTurn, "pozitif", "hurt", "closed"],
  ["stress", "irritated", repairTurn, "pozitif", "firm", "open"],
  ["happiness", "repairing", negativeTurn, "negatif", "balanced", "repairing-cautious"],
] as const;

describe("Core emotion-state Phase 5C cross-axis coherence", () => {
  it.each(cases)("%s + %s keeps both axes coherent", (a, m, semantic, sentiment, expectedRegister, expectedStance) => {
    const s = state(a, m); const t = trace(a, m, sentiment);
    const speech = computeKairoSpeechIdentity(personality, s, t);
    const contract = buildBehaviorContract(s, t, { stopTalking: false, stopQuestions: false, adviceRequested: false, semanticUncertainty: 0.1 });
    const result = resolve(a, m, semantic);

    expect(speech.register).toBe(expectedRegister);
    expect(contract.stance).toBe(expectedStance);
    expect(contract.advice).toBe("forbidden");
    expect(result.contextFactors.affectiveNegative).toBeGreaterThanOrEqual(0.7);
    expect(result.contextFactors.affectiveNegative).toBeLessThanOrEqual(1.3);
    expect(result.contextFactors.affectivePositive).toBeGreaterThanOrEqual(0.7);
    expect(result.contextFactors.affectivePositive).toBeLessThanOrEqual(1.3);

    if (m === "hurt" || m === "withdrawn" || m === "repairing") {
      expect(contract.reopeningCloseness).toBe("forbidden");
      expect(contract.affection).toBe("forbidden");
    }
  });

  it("keeps repairing cautious under high stress while stress still raises activation", () => {
    const stressed = resolve("stress", "repairing", negativeTurn);
    const calm = resolve("calmness", "repairing", negativeTurn);
    const s = state("stress", "repairing");
    const contract = buildBehaviorContract(s, trace("stress", "repairing", "negatif"), { stopTalking: false, stopQuestions: false, adviceRequested: false });
    expect(contract.stance).toBe("repairing-cautious");
    expect(contract.reopeningCloseness).toBe("forbidden");
    expect(stressed.appraisal.affective.activation).toBeGreaterThan(calm.appraisal.affective.activation);
    expect(stressed.appraisal.relational.harmEvidence).toBe(calm.appraisal.relational.harmEvidence);
  });

  it("keeps a serious negative self-share significant even at maximum happiness", () => {
    const happy = resolve("happiness", "irritated", seriousShare);
    const calm = resolve("calmness", "irritated", seriousShare);
    expect(happy.appraisal.affective.valence).toBe("negative");
    expect(happy.appraisal.affective.significance).toBeGreaterThanOrEqual(0.8);
    expect(happy.appraisal.affective.activation).toBeGreaterThanOrEqual(0.95);
    expect(happy.appraisal.affective.significance).toBeGreaterThanOrEqual(calm.appraisal.affective.significance);
    expect(happy.contextFactors.affectiveNegative).toBeGreaterThanOrEqual(0.7);
    expect(happy.contextFactors.affectiveNegative).toBeLessThanOrEqual(1.3);
  });
});
