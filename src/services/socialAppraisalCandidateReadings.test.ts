import { describe, expect, it } from "vitest";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { generateSocialAppraisalCandidateReadings } from "./socialAppraisalCandidateReadings";

function semantic(overrides: Record<string, unknown> = {}) {
  return normalizeSemanticInterpretation({
    primaryIntent: "smalltalk",
    secondarySocialActs: [],
    target: "kaira",
    valence: "neutral",
    severity: {
      disrespect: 0,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: 0,
    },
    jokingConfidence: 0,
    sincerityConfidence: 0.8,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0,
    apology: false,
    repairAttempt: false,
    uncertainty: {
      overall: 0.1,
      intent: 0.1,
      target: 0.1,
      severity: 0.1,
    },
    evidence: [],
    ...overrides,
  });
}

describe("social appraisal candidate readings", () => {
  it("keeps an ordinary neutral turn neutral without inventing social meaning", () => {
    const candidates = generateSocialAppraisalCandidateReadings(semantic());

    expect(candidates).toHaveLength(1);
    expect(candidates[0]).toMatchObject({
      kind: "neutral_social",
      direction: "neutral",
    });
  });

  it("preserves competing literal-harm and playful readings for an ambiguous insult", () => {
    const candidates = generateSocialAppraisalCandidateReadings(semantic({
      primaryIntent: "insult",
      secondarySocialActs: ["insult"],
      valence: "negative",
      severity: {
        disrespect: 0.45,
        coercion: 0,
        manipulation: 0,
        privacy: 0,
        aggression: 0.1,
      },
      jokingConfidence: 0.62,
      sincerityConfidence: 0.55,
      uncertainty: {
        overall: 0.52,
        intent: 0.5,
        target: 0.1,
        severity: 0.45,
      },
    }));

    expect(candidates.map((candidate) => candidate.kind)).toEqual([
      "literal_harm",
      "playful_banter",
    ]);
  });

  it("does not manufacture a playful alternative for an unambiguous sincere insult", () => {
    const candidates = generateSocialAppraisalCandidateReadings(semantic({
      primaryIntent: "insult",
      secondarySocialActs: ["insult"],
      valence: "negative",
      severity: {
        disrespect: 0.82,
        coercion: 0,
        manipulation: 0,
        privacy: 0,
        aggression: 0.4,
      },
      jokingConfidence: 0.05,
      sincerityConfidence: 0.95,
      uncertainty: {
        overall: 0.08,
        intent: 0.05,
        target: 0.05,
        severity: 0.1,
      },
    }));

    expect(candidates.map((candidate) => candidate.kind)).toEqual(["literal_harm"]);
  });

  it("represents affiliative and repair evidence in their own candidate classes", () => {
    const affection = generateSocialAppraisalCandidateReadings(semantic({
      primaryIntent: "compliment",
      valence: "positive",
      compliment: 0.8,
    }));
    const repair = generateSocialAppraisalCandidateReadings(semantic({
      primaryIntent: "apology",
      apology: true,
      repairAttempt: true,
      sincerityConfidence: 0.9,
    }));

    expect(affection.map((candidate) => candidate.kind)).toEqual(["affiliative"]);
    expect(repair.map((candidate) => candidate.kind)).toEqual(["repair"]);
  });

  it("never mutates or rewrites canonical semantic truth", () => {
    const interpretation = semantic({
      primaryIntent: "insult",
      secondarySocialActs: ["mockery"],
      jokingConfidence: 0.7,
      uncertainty: {
        overall: 0.6,
        intent: 0.6,
        target: 0.1,
        severity: 0.5,
      },
    });
    const before = JSON.stringify(interpretation);

    generateSocialAppraisalCandidateReadings(interpretation);

    expect(JSON.stringify(interpretation)).toBe(before);
  });
});
