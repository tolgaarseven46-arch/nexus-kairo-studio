import { describe, expect, it } from "vitest";
import { generateKairaActivityCandidates, type KairaActivityDescriptor } from "./kairaActivityCandidateGenerator";
import { planKairaActivityProposal, scoreKairaActivityProposal } from "./kairaActivityPlanningPolicy";
import type { KairaActivityMotivationProfile } from "./kairaActivityMotivation";

const motivation: KairaActivityMotivationProfile = {
  curiosity: 0.8,
  recreation: 0.6,
  growth: 0.55,
  rest: 0.25,
  social: 0.4,
  self_goal: 0.5,
};

const descriptor = (
  proposalId: string,
  overrides: Partial<KairaActivityDescriptor> = {},
): KairaActivityDescriptor => ({
  proposalId,
  activityType: "generic_experience",
  motivationAffinity: { curiosity: 1, recreation: 0.4 },
  preferenceKeys: ["preference:experience"],
  repetitionKey: "experience_family",
  noveltyPotential: 0.8,
  contextualFit: 0.8,
  interruptionCost: 0.1,
  risk: 0.1,
  availability: "available",
  permissionPolicy: "owner_approval",
  notBefore: "2026-09-02T18:00:00.000Z",
  expiresAt: "2026-09-02T20:00:00.000Z",
  evidenceIds: ["catalog:e1"],
  ...overrides,
});

describe("Kaira activity candidate generator contracts", () => {
  it("is deterministic, proposal-compatible and does not mutate inputs", () => {
    const descriptors = [descriptor("alpha")];
    const before = JSON.stringify(descriptors);
    const left = generateKairaActivityCandidates({ descriptors, motivation });
    const right = generateKairaActivityCandidates({ descriptors, motivation });
    expect(left).toEqual(right);
    expect(JSON.stringify(descriptors)).toBe(before);
    expect(() => scoreKairaActivityProposal(left[0])).not.toThrow();
  });

  it("does not use proposal or activity identity as a semantic scoring feature", () => {
    const [left] = generateKairaActivityCandidates({ descriptors: [descriptor("alpha", { activityType: "type_a" })], motivation });
    const [right] = generateKairaActivityCandidates({ descriptors: [descriptor("renamed", { activityType: "completely_different_label" })], motivation });
    const leftScore = scoreKairaActivityProposal(left);
    const rightScore = scoreKairaActivityProposal(right);
    expect(leftScore.score).toBe(rightScore.score);
    expect(leftScore.components).toEqual(rightScore.components);
  });

  it("lets matching learned preference raise preference signal", () => {
    const [baseline] = generateKairaActivityCandidates({ descriptors: [descriptor("a")], motivation });
    const [learned] = generateKairaActivityCandidates({
      descriptors: [descriptor("a")],
      motivation,
      learnedPreferences: [{
        key: "preference:experience",
        affinity: 0.9,
        confidence: 0.95,
        evidenceId: "memory:pref-1",
      }],
    });
    expect(learned.learnedPreference.affinity).toBeGreaterThan(baseline.learnedPreference.affinity);
    expect(scoreKairaActivityProposal(learned).score).toBeGreaterThan(scoreKairaActivityProposal(baseline).score);
    expect(learned.evidenceIds).toContain("memory:pref-1");
  });

  it("turns recent repetition into pressure and lower novelty/desirability", () => {
    const [fresh] = generateKairaActivityCandidates({ descriptors: [descriptor("a")], motivation });
    const [repeated] = generateKairaActivityCandidates({
      descriptors: [descriptor("a")],
      motivation,
      recentActivities: [{ repetitionKey: "experience_family", recency: 0.9, completionWeight: 1 }],
    });
    expect(repeated.repetitionPressure).toBeGreaterThan(fresh.repetitionPressure);
    expect(repeated.noveltyFit).toBeLessThan(fresh.noveltyFit);
    expect(scoreKairaActivityProposal(repeated).score).toBeLessThan(scoreKairaActivityProposal(fresh).score);
  });

  it("does not let preference erase risk and context penalties", () => {
    const candidates = generateKairaActivityCandidates({
      descriptors: [
        descriptor("safe", { contextualFit: 0.95, risk: 0.05 }),
        descriptor("risky", { contextualFit: 0.05, risk: 1 }),
      ],
      motivation,
      learnedPreferences: [{ key: "preference:experience", affinity: 1, confidence: 1 }],
    });
    expect(scoreKairaActivityProposal(candidates[0]).score).toBeGreaterThan(scoreKairaActivityProposal(candidates[1]).score);
  });

  it("fails closed on malformed descriptor safety fields", () => {
    const [candidate] = generateKairaActivityCandidates({
      descriptors: [descriptor("bad", {
        risk: Number.NaN,
        contextualFit: Number.POSITIVE_INFINITY,
        interruptionCost: -10,
        noveltyPotential: 9,
        availability: undefined,
      })],
      motivation,
    });
    expect(candidate.risk).toBe(1);
    expect(candidate.contextualFit).toBe(0);
    expect(candidate.interruptionCost).toBe(1);
    expect(candidate.noveltyFit).toBe(0);
    expect(candidate.availability).toBe("blocked");
    expect(Object.values(scoreKairaActivityProposal(candidate).components).every(Number.isFinite)).toBe(true);
  });

  it("allows weak motivation to remain weak so planning can choose none", () => {
    const weakProfile: KairaActivityMotivationProfile = {
      curiosity: 0.01,
      recreation: 0.01,
      growth: 0.01,
      rest: 0.01,
      social: 0.01,
      self_goal: 0.01,
    };
    const candidates = generateKairaActivityCandidates({
      descriptors: [descriptor("weak", {
        noveltyPotential: 0.05,
        contextualFit: 0.05,
        interruptionCost: 0.9,
        risk: 0.9,
      })],
      motivation: weakProfile,
    });
    const result = planKairaActivityProposal({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      candidates,
    });
    expect(result.status).toBe("none");
  });

  it("preserves input order for exact score ties rather than using IDs", () => {
    const candidates = generateKairaActivityCandidates({
      descriptors: [descriptor("zeta"), descriptor("alpha")],
      motivation,
    });
    const result = planKairaActivityProposal({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      candidates,
    });
    expect(result.ranked.map((item) => item.proposalId)).toEqual(["zeta", "alpha"]);
  });
});
