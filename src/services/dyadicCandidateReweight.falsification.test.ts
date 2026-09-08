import { describe, expect, it } from "vitest";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import { emptyDyadicSocialNorm, observeDyadicNorm, type DyadicNormImpact } from "./dyadicSocialNorm";
import { generateSocialAppraisalCandidateReadings } from "./socialAppraisalCandidateReadings";
import { reweightSocialAppraisalCandidatesForDyad } from "./dyadicCandidateReweight";

function semanticCase(severity: number, joking: number, uncertainty: number, target: "kaira" | "third_party" = "kaira") {
  return normalizeSemanticInterpretation({
    primaryIntent: "insult",
    secondarySocialActs: ["insult"],
    target,
    valence: "negative",
    severity: {
      disrespect: severity,
      coercion: 0,
      manipulation: 0,
      privacy: 0,
      aggression: severity * 0.35,
    },
    jokingConfidence: joking,
    sincerityConfidence: 1 - joking * 0.55,
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: Math.min(1, severity * 0.5),
    apology: false,
    repairAttempt: false,
    uncertainty: {
      overall: uncertainty,
      intent: uncertainty,
      target: 0.05,
      severity: uncertainty,
    },
    evidence: [],
  });
}

function profile(subjectId: string, impact: DyadicNormImpact, count: number) {
  let result = emptyDyadicSocialNorm(subjectId);
  for (let i = 0; i < count; i += 1) {
    result = observeDyadicNorm(result, {
      key: "insult",
      impact,
      observedAt: `2026-09-${String((i % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
    });
  }
  return result;
}

function candidateScore(
  result: ReturnType<typeof reweightSocialAppraisalCandidatesForDyad>,
  kind: "literal_harm" | "playful_banter",
) {
  const candidate = result.candidates.find((item) => item.kind === kind);
  expect(candidate).toBeDefined();
  return candidate!;
}

const severities = [0.05, 0.2, 0.45, 0.7, 0.95];
const jokingValues = [0.3, 0.45, 0.65, 0.9];
const uncertainties = [0.1, 0.35, 0.55, 0.8];
const observationCounts = [3, 4, 6, 10, 14];

describe("G2 dyadic appraisal falsification matrix", () => {
  it("never lets repeated harmful evidence increase playful plausibility", () => {
    for (const severity of severities) {
      for (const joking of jokingValues) {
        for (const uncertainty of uncertainties) {
          const semantic = semanticCase(severity, joking, uncertainty);
          const candidates = generateSocialAppraisalCandidateReadings(semantic);
          for (const count of observationCounts) {
            const result = reweightSocialAppraisalCandidatesForDyad(
              semantic,
              candidates,
              "alice",
              profile("alice", "harmful", count),
            );
            const playful = candidateScore(result, "playful_banter");
            expect(playful.plausibility).toBeLessThanOrEqual(playful.basePlausibility);
            expect(result.normReading?.permissiveCandidate).toBe(false);
          }
        }
      }
    }
  });

  it("never lets benign dyadic evidence erase the literal-harm candidate", () => {
    for (const severity of severities) {
      for (const joking of jokingValues) {
        for (const uncertainty of uncertainties) {
          const semantic = semanticCase(severity, joking, uncertainty);
          const candidates = generateSocialAppraisalCandidateReadings(semantic);
          for (const count of observationCounts) {
            const result = reweightSocialAppraisalCandidatesForDyad(
              semantic,
              candidates,
              "alice",
              profile("alice", "benign", count),
            );
            const harm = candidateScore(result, "literal_harm");
            expect(harm.plausibility).toBeGreaterThanOrEqual(0.2);
            expect(harm.plausibility).toBeGreaterThanOrEqual(harm.basePlausibility * 0.6);
          }
        }
      }
    }
  });

  it("preserves counterfactual subject isolation across the matrix", () => {
    for (const severity of severities) {
      for (const joking of jokingValues) {
        const semantic = semanticCase(severity, joking, 0.55);
        const candidates = generateSocialAppraisalCandidateReadings(semantic);
        const aliceProfile = profile("alice", "benign", 8);
        const result = reweightSocialAppraisalCandidatesForDyad(
          semantic,
          candidates,
          "bob",
          aliceProfile,
        );

        expect(result.subjectMatched).toBe(false);
        expect(result.dyadicApplied).toBe(false);
        for (const candidate of result.candidates) {
          expect(candidate.plausibility).toBe(candidate.basePlausibility);
          expect(candidate.dyadicAdjustment).toBe(0);
        }
      }
    }
  });

  it("preserves counterfactual target isolation across the matrix", () => {
    for (const severity of severities) {
      for (const joking of jokingValues) {
        const semantic = semanticCase(severity, joking, 0.55, "third_party");
        const candidates = generateSocialAppraisalCandidateReadings(semantic);
        const result = reweightSocialAppraisalCandidatesForDyad(
          semantic,
          candidates,
          "alice",
          profile("alice", "benign", 8),
        );

        expect(result.dyadicApplied).toBe(false);
        expect(result.reasons).toContain("event-not-targeting-kaira");
        for (const candidate of result.candidates) {
          expect(candidate.plausibility).toBe(candidate.basePlausibility);
        }
      }
    }
  });

  it("changes appraisal only when the dyadic evidence actually differs", () => {
    for (const severity of severities) {
      for (const joking of jokingValues) {
        const semantic = semanticCase(severity, joking, 0.55);
        const candidates = generateSocialAppraisalCandidateReadings(semantic);
        const alice = reweightSocialAppraisalCandidatesForDyad(
          semantic,
          candidates,
          "alice",
          profile("alice", "benign", 6),
        );
        const bobEquivalent = reweightSocialAppraisalCandidatesForDyad(
          semantic,
          candidates,
          "bob",
          profile("bob", "benign", 6),
        );
        const bobHarmful = reweightSocialAppraisalCandidatesForDyad(
          semantic,
          candidates,
          "bob",
          profile("bob", "harmful", 6),
        );

        expect(alice.candidates.map((item) => item.plausibility)).toEqual(
          bobEquivalent.candidates.map((item) => item.plausibility),
        );
        expect(alice.candidates.map((item) => item.plausibility)).not.toEqual(
          bobHarmful.candidates.map((item) => item.plausibility),
        );
      }
    }
  });
});
