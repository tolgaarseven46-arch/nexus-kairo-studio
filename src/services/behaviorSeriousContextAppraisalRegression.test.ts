import { describe, expect, it } from "vitest";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { appraiseBehaviorSeriousContext } from "./socialAppraisalEngine";
import { computeBehaviorProfile } from "./droitBehaviorEngine";

function semantic(input: Record<string, unknown>) {
  return normalizeSemanticInterpretation({
    schemaVersion: "semantic-interpretation@2",
    raw: "fixture",
    normalized: "fixture",
    primaryIntent: "other",
    secondarySocialActs: [],
    target: "unknown",
    valence: "neutral",
    severity: { disrespect: 0, coercion: 0, manipulation: 0, privacy: 0, aggression: 0 },
    jokingConfidence: 0,
    sincerityConfidence: 1,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0,
    apology: false,
    repairAttempt: false,
    stopRequest: false,
    discourseFacets: {
      socialRoutine: "none",
      discourseAct: "none",
      repairSignal: "none",
      adviceRequested: false,
      knowledgeQuery: null,
      selfMemoryQuery: null,
      relationalAct: "none",
      relationalIntensity: 0,
      stopQuestions: false,
      stopTalking: false,
    },
    uncertainty: { overall: 0, intent: 0, target: 0, severity: 0 },
    evidence: [],
    ...input,
  }, "fixture");
}

const humorousTraits = {
  humor: 95,
  seriousness: 20,
};

describe("canonical behavior seriousness appraisal", () => {
  it("suppresses humor from canonical salient emotional load without raw distress words", () => {
    const appraisal = appraiseBehaviorSeriousContext(semantic({ emotionalLoad: 0.8, valence: "negative" }));
    expect(appraisal.seriousContext).toBe(true);
    const profile = computeBehaviorProfile(humorousTraits, "bugün sıradan bir cümle", appraisal);
    expect(profile.humorLevel).toBeLessThanOrEqual(0.15);
  });

  it("does not let raw distress keywords override an explicit canonical benign appraisal", () => {
    const appraisal = appraiseBehaviorSeriousContext(semantic({ emotionalLoad: 0, valence: "neutral" }));
    expect(appraisal.seriousContext).toBe(false);
    const profile = computeBehaviorProfile(humorousTraits, "kötü acil tehlike saldır", appraisal);
    expect(profile.humorLevel).toBeGreaterThan(0.7);
  });

  it("treats high canonical severity as serious even without emotional-load salience", () => {
    const appraisal = appraiseBehaviorSeriousContext(semantic({
      severity: { disrespect: 0.1, coercion: 0.7, manipulation: 0, privacy: 0, aggression: 0.2 },
    }));
    expect(appraisal.seriousContext).toBe(true);
  });
});
