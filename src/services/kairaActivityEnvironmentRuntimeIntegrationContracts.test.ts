import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import type { KairaActivityCatalogEntry } from "./kairaActivityCatalogAuthority";
import { generateKairaActivityCandidatesFromEnvironmentForRuntime } from "./kairaActivityCandidateRuntime";

const NOW = "2026-09-02T12:05:00.000Z";
const dynamicState: DroitDynamicState = {
  calmness: 80,
  anger: 5,
  stress: 10,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "stable",
};
const catalog: KairaActivityCatalogEntry[] = [{
  catalogId: "experience_a",
  activityType: "generic",
  motivationAffinity: { curiosity: 1 },
  requiredCapabilities: ["world_access"],
  noveltyPotential: 0.8,
  permissionPolicy: "owner_approval",
}];
const environment = {
  schemaVersion: 1 as const,
  kairaInstanceId: "kaira_a",
  observedAt: "2026-09-02T12:00:00.000Z",
  entries: [{
    catalogId: "experience_a",
    accessible: true,
    capabilities: { world_access: true },
    contextFit: 0.9,
    risk: 0.1,
    evidenceIds: ["environment:experience_a"],
  }],
};

describe("Kaira environment-backed activity discovery contracts", () => {
  it("runs environment truth through runtime feasibility and generic candidate generation", () => {
    const result = generateKairaActivityCandidatesFromEnvironmentForRuntime({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      dynamicState,
      catalog,
      environment,
      activeExecutions: [],
      schedules: [],
      now: NOW,
      motivationContext: { stimulationNeed: 0.9, availableBandwidth: 0.9 },
    });
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].availability).toBe("available");
      expect(result.candidates[0].evidenceIds).toContain("environment:experience_a");
      expect(result.candidates[0].evidenceIds).toContain("capability:world_access");
    }
  });

  it("does not generate a candidate from stale environment truth", () => {
    const result = generateKairaActivityCandidatesFromEnvironmentForRuntime({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      dynamicState,
      catalog,
      environment: { ...environment, observedAt: "2026-09-02T10:00:00.000Z" },
      activeExecutions: [],
      schedules: [],
      now: NOW,
      maxEnvironmentAgeMinutes: 30,
    });
    expect(result.status).toBe("generated");
    if (result.status === "generated") expect(result.candidates).toEqual([]);
  });

  it("never lets another Kaira's environment snapshot drive this instance", () => {
    expect(() => generateKairaActivityCandidatesFromEnvironmentForRuntime({
      kairaInstanceId: "kaira_b",
      instanceType: "individual",
      dynamicState,
      catalog,
      environment,
      activeExecutions: [],
      schedules: [],
      now: NOW,
    })).toThrow("owner mismatch");
  });

  it("blocks Welcome before validating or consuming environment data", () => {
    expect(generateKairaActivityCandidatesFromEnvironmentForRuntime({
      kairaInstanceId: "welcome_a",
      instanceType: "welcome",
      dynamicState,
      catalog,
      environment: { ...environment, kairaInstanceId: "other", observedAt: "bad-time" },
      activeExecutions: [],
      schedules: [],
      now: "bad-time",
    })).toEqual({
      status: "disabled",
      reason: "autonomous_activity_planning_disabled",
      motivation: null,
      candidates: [],
    });
  });
});
