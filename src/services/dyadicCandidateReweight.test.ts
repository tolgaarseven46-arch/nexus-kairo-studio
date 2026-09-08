import { describe, expect, it } from "vitest";
import { normalizeSemanticInterpretation } from "./semanticInterpretationSchema";
import {
  emptyDyadicSocialNorm,
  observeDyadicNorm,
  type DyadicNormImpact,
} from "./dyadicSocialNorm";
import { generateSocialAppraisalCandidateReadings } from "./socialAppraisalCandidateReadings";
import { reweightSocialAppraisalCandidatesForDyad } from "./dyadicCandidateReweight";

function ambiguousInsult() {
  return normalizeSemanticInterpretation({
    primaryIntent: "insult",
    secondarySocialActs: ["insult"],
    target: "kaira",
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
    affection: 0,
    support: 0,
    compliment: 0,
    emotionalLoad: 0.2,
    apology: false,
    repairAttempt: false,
    uncertainty: {
      overall: 0.52,
      intent: 0.5,
      target: 0.1,
      severity: 0.45,
    },
    evidence: [],
  });
}

function profile(subjectId: string, impacts: DyadicNormImpact[]) {
  return impacts.reduce(
    (state, impact, index) => observeDyadicNorm(state, {
      key: "insult",
      impact,
      observedAt: `2026-09-0${index + 1}T12:00:00.000Z`,
    }),
    emptyDyadicSocialNorm(subjectId),
  );
}

function score(result: ReturnType<typeof reweightSocialAppraisalCandidatesForDyad>, kind: string) {
  return result.candidates.find((candidate) => candidate.kind === kind)?.plausibility ?? -1;
}

describe("dyadic candidate reweight G2", () => {
  it("makes the same canonical ambiguous event appraise differently for two people", () => {
    const semantic = ambiguousInsult();
    const candidates = generateSocialAppraisalCandidateReadings(semantic);
    const alice = profile("alice", ["benign", "benign", "benign", "benign"]);
    const bob = profile("bob", ["harmful", "harmful", "harmful", "harmful"]);

    const forAlice = reweightSocialAppraisalCandidatesForDyad(semantic, candidates, "alice", alice);
    const forBob = reweightSocialAppraisalCandidatesForDyad(semantic, candidates, "bob", bob);

    expect(forAlice.dyadicApplied).toBe(true);
    expect(forBob.dyadicApplied).toBe(true);
    expect(score(forAlice, "playful_banter")).toBeGreaterThan(score(forBob, "playful_banter"));
    expect(score(forAlice, "literal_harm")).toBeLessThan(score(forBob, "literal_harm"));
  });

  it("never lets an established benign pattern erase canonical harm", () => {
    const semantic = ambiguousInsult();
    const candidates = generateSocialAppraisalCandidateReadings(semantic);
    const alice = profile("alice", ["benign", "benign", "benign", "benign", "benign"]);

    const result = reweightSocialAppraisalCandidatesForDyad(semantic, candidates, "alice", alice);
    const harm = result.candidates.find((candidate) => candidate.kind === "literal_harm");

    expect(harm).toBeDefined();
    expect(harm!.plausibility).toBeGreaterThanOrEqual(0.2);
    expect(harm!.plausibility).toBeGreaterThanOrEqual(harm!.basePlausibility * 0.6);
  });

  it("does not treat repeated harmful familiarity as playful permission", () => {
    const semantic = ambiguousInsult();
    const candidates = generateSocialAppraisalCandidateReadings(semantic);
    const alice = profile("alice", ["harmful", "harmful", "harmful", "harmful", "harmful"]);

    const result = reweightSocialAppraisalCandidatesForDyad(semantic, candidates, "alice", alice);
    const playful = result.candidates.find((candidate) => candidate.kind === "playful_banter");

    expect(result.normReading?.expectedness).toBeGreaterThan(0.5);
    expect(result.normReading?.permissiveCandidate).toBe(false);
    expect(playful!.plausibility).toBeLessThan(playful!.basePlausibility);
  });

  it("refuses cross-person norm leakage", () => {
    const semantic = ambiguousInsult();
    const candidates = generateSocialAppraisalCandidateReadings(semantic);
    const alice = profile("alice", ["benign", "benign", "benign", "benign"]);

    const result = reweightSocialAppraisalCandidatesForDyad(semantic, candidates, "bob", alice);

    expect(result.subjectMatched).toBe(false);
    expect(result.dyadicApplied).toBe(false);
    expect(result.reasons).toContain("dyadic-subject-mismatch");
    for (const candidate of result.candidates) {
      expect(candidate.plausibility).toBe(candidate.basePlausibility);
      expect(candidate.dyadicAdjustment).toBe(0);
    }
  });

  it("never applies the Kaira-user dyadic norm to a third-party target", () => {
    const semantic = normalizeSemanticInterpretation({
      ...ambiguousInsult(),
      target: "third_party",
    });
    const candidates = generateSocialAppraisalCandidateReadings(semantic);
    const alice = profile("alice", ["benign", "benign", "benign", "benign"]);

    const result = reweightSocialAppraisalCandidatesForDyad(semantic, candidates, "alice", alice);

    expect(result.subjectMatched).toBe(true);
    expect(result.dyadicApplied).toBe(false);
    expect(result.reasons).toContain("event-not-targeting-kaira");
    for (const candidate of result.candidates) {
      expect(candidate.plausibility).toBe(candidate.basePlausibility);
    }
  });

  it("does not learn a norm from one benign observation", () => {
    const semantic = ambiguousInsult();
    const candidates = generateSocialAppraisalCandidateReadings(semantic);
    const alice = profile("alice", ["benign"]);

    const result = reweightSocialAppraisalCandidatesForDyad(semantic, candidates, "alice", alice);

    expect(result.dyadicApplied).toBe(false);
    expect(result.normReading?.established).toBe(false);
    expect(result.reasons).toContain("dyadic-norm-not-established");
  });
});
