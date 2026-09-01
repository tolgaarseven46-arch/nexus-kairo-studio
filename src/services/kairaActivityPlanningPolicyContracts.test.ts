import { describe, expect, it } from "vitest";
import {
  planKairaActivityProposal,
  scoreKairaActivityProposal,
  type KairaActivityProposalCandidate,
} from "./kairaActivityPlanningPolicy";

const candidate = (
  proposalId: string,
  overrides: Partial<KairaActivityProposalCandidate> = {},
): KairaActivityProposalCandidate => ({
  proposalId,
  activityType: "theatre",
  motivation: { kind: "recreation", strength: 0.8 },
  learnedPreference: { affinity: 0.5, confidence: 0.8 },
  noveltyFit: 0.6,
  contextualFit: 0.8,
  interruptionCost: 0.1,
  risk: 0.1,
  repetitionPressure: 0.1,
  availability: "available",
  permissionPolicy: "owner_approval",
  notBefore: "2026-09-02T18:00:00.000Z",
  expiresAt: "2026-09-02T20:00:00.000Z",
  evidenceIds: ["self:recreation", "preference:theatre"],
  ...overrides,
});

describe("Kaira activity planning policy contracts", () => {
  it("selects comparatively without activity-name-specific rules", () => {
    const result = planKairaActivityProposal({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      candidates: [
        candidate("quiet_walk", {
          activityType: "walk",
          motivation: { kind: "rest", strength: 0.58 },
          learnedPreference: { affinity: 0.25, confidence: 0.7 },
          contextualFit: 0.68,
        }),
        candidate("theatre_night"),
      ],
    });
    expect(result.status).toBe("selected");
    if (result.status === "selected") {
      expect(result.selected.proposalId).toBe("theatre_night");
      expect(result.ranked).toHaveLength(2);
    }
  });

  it("lets strong learned dislike reduce a proposal instead of hardcoding category bans", () => {
    const liked = scoreKairaActivityProposal(candidate("liked", {
      learnedPreference: { affinity: 0.8, confidence: 0.95 },
    }));
    const disliked = scoreKairaActivityProposal(candidate("disliked", {
      learnedPreference: { affinity: -0.9, confidence: 0.95 },
      noveltyFit: 1,
    }));
    expect(liked.score).toBeGreaterThan(disliked.score);
  });

  it("never selects blocked activities even when their utility inputs are strong", () => {
    const result = planKairaActivityProposal({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      candidates: [candidate("blocked", {
        availability: "blocked",
        motivation: { kind: "curiosity", strength: 1 },
        learnedPreference: { affinity: 1, confidence: 1 },
        noveltyFit: 1,
        contextualFit: 1,
      })],
    });
    expect(result).toEqual({ status: "none", reason: "all_blocked", ranked: [] });
  });

  it("returns none rather than forcing activity when every available proposal is weak", () => {
    const result = planKairaActivityProposal({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      candidates: [candidate("weak", {
        motivation: { kind: "recreation", strength: 0.05 },
        learnedPreference: { affinity: 0, confidence: 0 },
        noveltyFit: 0.05,
        contextualFit: 0.05,
        interruptionCost: 0.8,
        risk: 0.8,
        repetitionPressure: 0.8,
      })],
    });
    expect(result.status).toBe("none");
    if (result.status === "none") expect(result.reason).toBe("below_threshold");
  });

  it("keeps welcome/onboarding Kaira out of autonomous activity planning", () => {
    expect(
      planKairaActivityProposal({
        kairaInstanceId: "welcome_1",
        instanceType: "welcome",
        candidates: [candidate("theatre")],
      }),
    ).toEqual({ status: "none", reason: "all_blocked", ranked: [] });
  });

  it("normalizes evidence and rejects invalid temporal windows", () => {
    const scored = scoreKairaActivityProposal(candidate("Theatre Night", {
      evidenceIds: ["e1", "e1", "", "e2"],
    }));
    expect(scored.proposalId).toBe("theatre_night");
    expect(scored.candidate.evidenceIds).toEqual(["e1", "e2"]);

    expect(() => scoreKairaActivityProposal(candidate("bad", {
      notBefore: "2026-09-02T20:00:00.000Z",
      expiresAt: "2026-09-02T19:00:00.000Z",
    }))).toThrow("Invalid Kaira activity proposal candidate");
  });
});
