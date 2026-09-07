import { describe, expect, it } from "vitest";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { semanticNegativePattern } from "./kdmRelationshipReducerBridge";
import { socialNegativePattern } from "./socialAppraisalEngine";

function semantic(input: Record<string, unknown>) {
  return normalizeSemanticInterpretation({
    schemaVersion: "semantic-interpretation@2",
    raw: "fixture",
    normalized: "fixture",
    primaryIntent: "other",
    secondarySocialActs: [],
    target: "kaira",
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

describe("KDM relationship bridge shared-appraisal regression", () => {
  it("keeps the compatibility export identical to the shared appraisal authority", () => {
    const cases = [
      semantic({ primaryIntent: "insult", severity: { disrespect: 0.4, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.2 } }),
      semantic({ primaryIntent: "insult", jokingConfidence: 0.9, sincerityConfidence: 0.1, uncertainty: { overall: 0.2, intent: 0.1, target: 0.1, severity: 0.2 }, severity: { disrespect: 0.8, coercion: 0, manipulation: 0, privacy: 0, aggression: 0.5 } }),
      semantic({ secondarySocialActs: ["coercion"], severity: { disrespect: 0, coercion: 0.5, manipulation: 0, privacy: 0, aggression: 0 } }),
      semantic({ primaryIntent: "rejection" }),
    ];

    for (const current of cases) {
      expect(semanticNegativePattern(current)).toBe(socialNegativePattern(current));
    }
  });
});
