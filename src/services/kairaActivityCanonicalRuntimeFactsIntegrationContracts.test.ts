import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import type { KairaActivityCatalogEntry } from "./kairaActivityCatalogAuthority";
import { generateKairaActivityCandidatesFromCanonicalRuntimeFacts } from "./kairaActivityCandidateRuntime";
import { createKairaActivityExecution } from "./kairaActivityExecution";

const NOW = "2026-09-02T12:00:00.000Z";
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
  activityType: "generic_experience",
  motivationAffinity: { curiosity: 1 },
  requiredCapabilities: ["world_access"],
  noveltyPotential: 0.8,
  permissionPolicy: "owner_approval",
}];

const worldFacts = [{
  catalogId: "experience_a",
  capabilityFacts: { world_access: true },
  accessible: true,
  baseContextFit: 0.9,
  baseRisk: 0.05,
  evidenceIds: ["world:experience_a"],
}];

describe("Kaira canonical activity runtime fact integration contracts", () => {
  it("runs the canonical source-snapshot to candidate pipeline without side effects", () => {
    const before = JSON.stringify({ catalog, worldFacts, dynamicState });
    const result = generateKairaActivityCandidatesFromCanonicalRuntimeFacts({
      instanceType: "individual",
      dynamicState,
      catalog,
      worldFacts,
      activeExecutions: [],
      schedules: [],
      now: NOW,
      motivationContext: { stimulationNeed: 0.9, availableBandwidth: 0.9 },
    });
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].availability).toBe("available");
      expect(result.candidates[0].evidenceIds).toContain("world:experience_a");
      expect(result.candidates[0].motivation.kind).toBe("curiosity");
    }
    expect(JSON.stringify({ catalog, worldFacts, dynamicState })).toBe(before);
  });

  it("blocks before runtime projection for Welcome Kaira", () => {
    expect(generateKairaActivityCandidatesFromCanonicalRuntimeFacts({
      instanceType: "welcome",
      dynamicState,
      catalog,
      worldFacts: [{ ...worldFacts[0], baseRisk: Number.NaN }],
      activeExecutions: [],
      schedules: [],
      now: "not-a-time",
    })).toEqual({
      status: "disabled",
      reason: "autonomous_activity_planning_disabled",
      motivation: null,
      candidates: [],
    });
  });

  it("lets existing execution load suppress otherwise attractive catalog candidates", () => {
    const active = (id: string) => ({
      ...createKairaActivityExecution({
        ownerUserId: "user_a",
        kairaInstanceId: "kaira_a",
        instanceType: "individual",
        activityId: id,
        activityType: "generic",
        now: NOW,
      }),
      phase: "active" as const,
      startedAt: NOW,
    });
    const result = generateKairaActivityCandidatesFromCanonicalRuntimeFacts({
      instanceType: "individual",
      dynamicState,
      catalog,
      worldFacts,
      activeExecutions: [active("other_a"), active("other_b")],
      schedules: [],
      now: NOW,
      motivationContext: { stimulationNeed: 1, availableBandwidth: 1 },
      learnedPreferences: [{ key: "unused", affinity: 1, confidence: 1 }],
    });
    expect(result.status).toBe("generated");
    if (result.status === "generated") {
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].availability).toBe("blocked");
      expect(result.candidates[0].interruptionCost).toBe(1);
    }
  });

  it("does not materialize a catalog activity when canonical world facts are absent", () => {
    const result = generateKairaActivityCandidatesFromCanonicalRuntimeFacts({
      instanceType: "individual",
      dynamicState,
      catalog,
      worldFacts: [],
      activeExecutions: [],
      schedules: [],
      now: NOW,
    });
    expect(result.status).toBe("generated");
    if (result.status === "generated") expect(result.candidates).toEqual([]);
  });
});
