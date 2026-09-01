import { describe, expect, it } from "vitest";
import { evaluateTriggeredKairaActivityPlanning } from "./kairaActivityPlanningRuntime";

const input = () => ({
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  trigger: {
    triggerId: "idle_1",
    kind: "idle_transition" as const,
    sourceId: "presence_1",
    occurredAt: "2026-09-02T11:59:30.000Z",
    previousBusy: true,
    currentBusy: false as const,
  },
  catalog: [{
    catalogId: "explore_archive",
    activityType: "exploration",
    motivationAffinity: { curiosity: 1 },
    requiredCapabilities: ["archive_access"],
    noveltyPotential: 0.9,
    permissionPolicy: "not_required" as const,
    evidenceIds: ["catalog:archive"],
  }],
  environment: {
    schemaVersion: 1 as const,
    kairaInstanceId: "kaira_a",
    observedAt: "2026-09-02T11:58:00.000Z",
    entries: [{
      catalogId: "explore_archive",
      accessible: true,
      capabilities: { archive_access: true },
      contextFit: 0.95,
      risk: 0.05,
      evidenceIds: ["environment:archive_open"],
    }],
  },
  activeExecutions: [] as any[],
  schedules: [] as any[],
  dynamicState: {
    calmness: 80,
    anger: 5,
    stress: 10,
    happiness: 70,
    confidence: 70,
    surprise: 40,
  } as any,
  motivationContext: { availableBandwidth: 1, stimulationNeed: 1 },
  now: "2026-09-02T12:00:00.000Z",
  policy: {
    minimumScore: 0,
    weights: {
      motivation: 0.28,
      preference: 0.24,
      novelty: 0.12,
      context: 0.2,
      interruptionCost: 0.06,
      risk: 0.06,
      repetition: 0.04,
    },
  },
});

describe("Kaira triggered activity planning runtime contracts", () => {
  it("runs the full environment-to-selection path only after an accepted trigger", () => {
    const result = evaluateTriggeredKairaActivityPlanning(input());
    expect(result.status).toBe("evaluated");
    if (result.status !== "evaluated") throw new Error("expected evaluation");
    expect(result.candidateRuntime.status).toBe("generated");
    expect(result.planning.status).toBe("selected");
    if (result.planning.status === "selected") {
      expect(result.planning.selected.proposalId).toBe("explore_archive");
    }
  });

  it("does not even generate candidates when trigger policy suppresses evaluation", () => {
    const value = input();
    value.activeExecutions = [{ phase: "active" }] as any[];
    const result = evaluateTriggeredKairaActivityPlanning(value);
    expect(result).toMatchObject({
      status: "suppressed",
      triggerDecision: { reason: "active_execution" },
      candidateRuntime: null,
      planning: null,
    });
  });

  it("does not turn stale environment truth into a selected activity", () => {
    const value = input();
    value.environment.observedAt = "2026-09-02T10:00:00.000Z";
    const result = evaluateTriggeredKairaActivityPlanning(value);
    expect(result.status).toBe("evaluated");
    if (result.status !== "evaluated") throw new Error("expected evaluation");
    expect(result.planning).toMatchObject({ status: "none", reason: "no_candidates" });
  });
});
