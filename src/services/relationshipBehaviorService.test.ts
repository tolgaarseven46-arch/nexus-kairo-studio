import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import { computeBehaviorProfile } from "./droitBehaviorEngine";
import { applyRelationshipContext } from "./relationshipBehaviorService";

function state(
  interactionCount: number,
  familiarityDays: number,
  warmth: number,
  trust: number,
  conflictScore = 0,
  hurtScore = 0,
): DroitDynamicState {
  return {
    calmness: 70,
    anger: 10,
    stress: 20,
    happiness: 70,
    confidence: 70,
    surprise: 10,
    lastStatus: "Sakin",
    relationship: {
      firstSeenAt: "2026-01-01T00:00:00.000Z",
      lastInteractionAt: "2026-08-28T00:00:00.000Z",
      interactionCount,
      familiarityDays,
      warmth,
      trust,
      positiveEvents: 0,
      negativeEvents: 0,
      conflictScore,
      hurtScore,
      repairProgress: 0,
      repeatedNegativeCount: 0,
    },
  };
}

describe("Kaira relationship behavior contract", () => {
  it("keeps a new relationship measured", () => {
    const profile = applyRelationshipContext(computeBehaviorProfile(undefined, "selam"), state(0, 0, 50, 50));
    expect(profile.relationshipInstruction).toContain("İlişki yeni");
    expect(profile.relationshipInstruction).toContain("aşırı samimiyet");
  });

  it("allows earned warmth without forcing it", () => {
    const profile = applyRelationshipContext(computeBehaviorProfile(undefined, "selam"), state(80, 90, 85, 85));
    expect(profile.relationshipInstruction).toContain("sıcak ve güvenli");
    expect(profile.relationshipInstruction).toContain("toleranslı");
  });

  it("does not restore old intimacy during active hurt", () => {
    const profile = applyRelationshipContext(computeBehaviorProfile(undefined, "selam"), state(80, 90, 70, 40, 60, 65));
    expect(profile.relationshipInstruction).toContain("ciddi biçimde hasarlı");
    expect(profile.relationshipInstruction).toContain("eski samimiyete dönüş yapma");
  });
});
