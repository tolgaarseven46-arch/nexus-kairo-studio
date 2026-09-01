import { describe, expect, it } from "vitest";
import {
  generateKairaActivityCandidatesForRuntime,
  generateKairaActivityCandidatesFromCatalogForRuntime,
} from "./kairaActivityCandidateRuntime";
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

  it("runs the canonical catalog -> descriptor -> motivation -> candidate path", () => {
    const result = generateKairaActivityCandidatesFromCatalogForRuntime({
      instanceType: "individual",
      dynamicState,
      catalog: [{
        catalogId: "catalog_a",
        activityType: "generic",
        motivationAffinity: { curiosity: 1 },
        requiredCapabilities: ["world_access"],
        noveltyPotential: 0.7,
        permissionPolicy: "owner_approval",
      }],
      catalogRuntime: {
        capabilities: { world_access: true },
        assessments: [{
          catalogId: "catalog_a",
          availability: "available",
          contextualFit: 0.8,
          interruptionCost: 0.1,
          risk: 0.1,
          notBefore: "2026-09-02T18:00:00.000Z",
        }],
      },
      motivationContext: { stimulationNeed: 0.9, availableBandwidth: 0.8 },
    });
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].proposalId).toBe("catalog_a");
      expect(result.candidates[0].permissionPolicy).toBe("owner_approval");
      expect(result.candidates[0].availability).toBe("available");
    }
  });

  it("short-circuits Welcome before malformed catalog data can become runtime work", () => {
    expect(generateKairaActivityCandidatesFromCatalogForRuntime({
      instanceType: "welcome",
      dynamicState,
      catalog: [{
        catalogId: "",
        activityType: "",
        motivationAffinity: {},
        noveltyPotential: Number.NaN,
        permissionPolicy: "none",
      }],
      catalogRuntime: { capabilities: {}, assessments: [] },
    })).toEqual({
      status: "disabled",
      reason: "autonomous_activity_planning_disabled",
      motivation: null,
      candidates: [],
    });
  });
});
