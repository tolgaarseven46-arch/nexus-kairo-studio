import { describe, expect, it } from "vitest";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { emptyDyadicSocialNorm, observeDyadicNorm, type DyadicNormImpact } from "./dyadicSocialNorm";
import { resolveSocialAppraisalG3 } from "./socialAppraisalResolution";

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

function ambiguousInsult(target: "kaira" | "third_party" = "kaira") {
  return semantic({
    primaryIntent: "insult",
    secondarySocialActs: ["insult"],
    target,
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
    emotionalLoad: 0.2,
    uncertainty: {
      overall: 0.52,
      intent: 0.5,
      target: 0.1,
      severity: 0.45,
    },
  });
}

function profile(subjectId: string, impact: DyadicNormImpact, count: number) {
  let result = emptyDyadicSocialNorm(subjectId);
  for (let i = 0; i < count; i += 1) {
    result = observeDyadicNorm(result, {
      key: "insult",
      impact,
      observedAt: `2026-09-${String(i + 1).padStart(2, "0")}T12:00:00.000Z`,
    });
  }
  return result;
}

describe("SocialAppraisal G3 resolution", () => {
  it("returns the exact-zero first-class result for a neutral no-evidence turn", () => {
    const result = resolveSocialAppraisalG3(semantic(), "alice");

    expect(result.candidates).toEqual([]);
    expect(result.dominantReading).toBeNull();
    expect(result.appraisal.noMaterialEffect).toBe(true);
    expect(result.appraisal.relational.significance).toBe(0);
    expect(result.appraisal.affective.significance).toBe(0);
  });

  it("turns the same canonical event into different relational and affective pressure for different dyads", () => {
    const event = ambiguousInsult();
    const alice = resolveSocialAppraisalG3(event, "alice", profile("alice", "benign", 5));
    const bob = resolveSocialAppraisalG3(event, "bob", profile("bob", "harmful", 5));

    expect(alice.dyadicApplied).toBe(true);
    expect(bob.dyadicApplied).toBe(true);
    expect(alice.appraisal.relational.harmEvidence).toBeLessThan(
      bob.appraisal.relational.harmEvidence,
    );
    expect(alice.appraisal.affective.significance).toBeLessThan(
      bob.appraisal.affective.significance,
    );
    expect(alice.appraisal.noMaterialEffect).toBe(false);
    expect(bob.appraisal.noMaterialEffect).toBe(false);
  });

  it("keeps third-party social harm out of the Kaira-user relationship projection", () => {
    const event = ambiguousInsult("third_party");
    const result = resolveSocialAppraisalG3(event, "alice", profile("alice", "benign", 5));

    expect(result.dyadicApplied).toBe(false);
    expect(result.appraisal.relational.significance).toBe(0);
    expect(result.appraisal.relational.harmEvidence).toBe(0);
    expect(result.appraisal.affective.significance).toBeGreaterThan(0);
  });

  it("allows an emotional share to affect Kaira without inventing relationship injury", () => {
    const event = semantic({
      primaryIntent: "emotional_share",
      target: "self",
      valence: "negative",
      emotionalLoad: 0.9,
      uncertainty: {
        overall: 0.1,
        intent: 0.1,
        target: 0.05,
        severity: 0.05,
      },
    });
    const result = resolveSocialAppraisalG3(event, "alice");

    expect(result.appraisal.relational.significance).toBe(0);
    expect(result.appraisal.affective.valence).toBe("negative");
    expect(result.appraisal.affective.significance).toBeGreaterThan(0.6);
    expect(result.appraisal.affective.activation).toBeGreaterThan(0.8);
  });

  it("preserves literal harm under an established benign banter norm", () => {
    const event = ambiguousInsult();
    const result = resolveSocialAppraisalG3(event, "alice", profile("alice", "benign", 8));

    expect(result.appraisal.relational.harmEvidence).toBeGreaterThanOrEqual(0.2);
    expect(result.appraisal.relational.valence).toBe("negative");
  });
});
