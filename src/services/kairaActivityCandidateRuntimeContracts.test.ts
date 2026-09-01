import { describe, expect, it } from "vitest";
import { generateKairaActivityCandidatesForRuntime } from "./kairaActivityCandidateRuntime";
import type { KairaActivityDescriptor } from "./kairaActivityCandidateGenerator";
import type { DroitDynamicState } from "../types/nexus";

const dynamicState: DroitDynamicState = {
  calmness: 70,
  anger: 10,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "stable",
};

const descriptors: KairaActivityDescriptor[] = [{
  proposalId: "candidate_a",
  activityType: "generic",
  motivationAffinity: { curiosity: 1 },
  noveltyPotential: 0.7,
  contextualFit: 0.8,
  interruptionCost: 0.1,
  risk: 0.1,
  availability: "available",
  notBefore: "2026-09-02T18:00:00.000Z",
}];

describe("Kaira activity candidate runtime contracts", () => {
  it("blocks Welcome Kaira at the canonical instance-policy boundary", () => {
    expect(generateKairaActivityCandidatesForRuntime({
      instanceType: "welcome",
      dynamicState,
      descriptors,
    })).toEqual({
      status: "disabled",
      reason: "autonomous_activity_planning_disabled",
      motivation: null,
      candidates: [],
    });
  });

  it("allows an individual Kaira to derive candidates without side effects", () => {
    const result = generateKairaActivityCandidatesForRuntime({
      instanceType: "individual",
      dynamicState,
      descriptors,
      motivationContext: { stimulationNeed: 0.9, availableBandwidth: 0.8 },
    });
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].motivation.kind).toBe("curiosity");
    }
  });
});
