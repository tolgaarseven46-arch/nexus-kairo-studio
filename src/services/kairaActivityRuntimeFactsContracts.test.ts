import { describe, expect, it } from "vitest";
import type { DroitDynamicState } from "../types/nexus";
import type { KairaActivityCatalogEntry } from "./kairaActivityCatalogAuthority";
import { createKairaActivityExecution } from "./kairaActivityExecution";
import { createKairaActivitySchedule } from "./kairaActivitySchedule";
import {
  projectKairaActivityRuntimeFacts,
  type KairaActivityWorldRuntimeFact,
} from "./kairaActivityRuntimeFacts";

const NOW = "2026-09-02T12:00:00.000Z";

const state = (overrides: Partial<DroitDynamicState> = {}): DroitDynamicState => ({
  calmness: 80,
  anger: 5,
  stress: 10,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "stable",
  ...overrides,
});

const catalog = (catalogId = "theatre"): KairaActivityCatalogEntry => ({
  catalogId,
  activityType: "generic_experience",
  motivationAffinity: { recreation: 1 },
  requiredCapabilities: ["world_access"],
  noveltyPotential: 0.7,
  permissionPolicy: "owner_approval",
});

const world = (
  catalogId = "theatre",
  overrides: Partial<KairaActivityWorldRuntimeFact> = {},
): KairaActivityWorldRuntimeFact => ({
  catalogId,
  capabilityFacts: { world_access: true },
  accessible: true,
  baseContextFit: 0.9,
  baseRisk: 0.1,
  evidenceIds: ["world:access:1"],
  ...overrides,
});

const project = (overrides: Partial<Parameters<typeof projectKairaActivityRuntimeFacts>[0]> = {}) =>
  projectKairaActivityRuntimeFacts({
    catalog: [catalog()],
    worldFacts: [world()],
    activeExecutions: [],
    schedules: [],
    dynamicState: state(),
    now: NOW,
    ...overrides,
  });

describe("Kaira activity runtime fact authority contracts", () => {
  it("projects explicit world capability/access into an available runtime assessment", () => {
    const result = project();
    expect(result.capabilities).toEqual({ world_access: true });
    expect(result.assessments).toHaveLength(1);
    expect(result.assessments[0].availability).toBe("available");
    expect(result.assessments[0].risk).toBe(0.1);
    expect(result.assessments[0].evidenceIds).toContain("world:access:1");
  });

  it("never invents capability truth from schedule, execution or dynamic state", () => {
    const execution = createKairaActivityExecution({
      ownerUserId: "user_a",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      activityId: "other",
      activityType: "generic",
      now: NOW,
    });
    const schedule = createKairaActivitySchedule({
      ownerUserId: "user_a",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      activityId: "other",
      notBefore: "2026-09-02T12:10:00.000Z",
      now: NOW,
    });
    const result = project({
      worldFacts: [world("theatre", { capabilityFacts: {} })],
      activeExecutions: [execution],
      schedules: [schedule],
      dynamicState: state({ calmness: 100, stress: 0, anger: 0 }),
    });
    expect(result.capabilities).toEqual({});
  });

  it("fails closed when world access is not explicitly available", () => {
    expect(project({ worldFacts: [world("theatre", { accessible: false })] }).assessments[0].availability)
      .toBe("blocked");
  });

  it("raises interruption cost from canonical execution, schedule and state pressure", () => {
    const active = {
      ...createKairaActivityExecution({
        ownerUserId: "user_a",
        kairaInstanceId: "kaira_a",
        instanceType: "individual",
        activityId: "active_other",
        activityType: "generic",
        now: NOW,
      }),
      phase: "active" as const,
      startedAt: NOW,
    };
    const near = createKairaActivitySchedule({
      ownerUserId: "user_a",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      activityId: "near_other",
      notBefore: "2026-09-02T12:05:00.000Z",
      now: NOW,
    });
    const baseline = project().assessments[0].interruptionCost;
    const pressured = project({
      activeExecutions: [active],
      schedules: [near],
      dynamicState: state({ calmness: 5, stress: 100, anger: 100 }),
    }).assessments[0];
    expect(pressured.interruptionCost).toBeGreaterThan(baseline);
    expect(pressured.contextualFit).toBeLessThan(project().assessments[0].contextualFit);
  });

  it("blocks activity when canonical process pressure is already saturated", () => {
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
    const result = project({ activeExecutions: [active("a"), active("b")] });
    expect(result.assessments[0].interruptionCost).toBe(1);
    expect(result.assessments[0].availability).toBe("blocked");
  });

  it("uses the canonical matching schedule window instead of inventing a new one", () => {
    const schedule = createKairaActivitySchedule({
      ownerUserId: "user_a",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      activityId: "theatre",
      notBefore: "2026-09-02T13:00:00.000Z",
      expiresAt: "2026-09-02T15:00:00.000Z",
      now: NOW,
    });
    const assessment = project({ schedules: [schedule] }).assessments[0];
    expect(assessment.notBefore).toBe("2026-09-02T13:00:00.000Z");
    expect(assessment.expiresAt).toBe("2026-09-02T15:00:00.000Z");
    expect(assessment.evidenceIds).toContain("schedule:theatre:scheduled");
  });

  it("uses pessimistic risk/context defaults for malformed world projection values", () => {
    const assessment = project({
      worldFacts: [world("theatre", { baseRisk: Number.NaN, baseContextFit: Number.POSITIVE_INFINITY })],
    }).assessments[0];
    expect(assessment.risk).toBe(1);
    expect(assessment.contextualFit).toBe(0);
  });

  it("rejects conflicting capability truth instead of letting input order win", () => {
    expect(() => project({
      catalog: [catalog("a"), catalog("b")],
      worldFacts: [
        world("a", { capabilityFacts: { world_access: true } }),
        world("b", { capabilityFacts: { world_access: false } }),
      ],
    })).toThrow("Conflicting Kaira activity capability runtime fact");
  });

  it("rejects duplicate world runtime facts and never mutates source snapshots", () => {
    const worldFacts = [world()];
    const before = JSON.stringify(worldFacts);
    project({ worldFacts });
    expect(JSON.stringify(worldFacts)).toBe(before);
    expect(() => project({ worldFacts: [world(), world()] }))
      .toThrow("Duplicate Kaira activity world runtime fact");
  });
});
