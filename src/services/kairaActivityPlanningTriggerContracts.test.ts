import { describe, expect, it } from "vitest";
import { evaluateKairaActivityPlanningTrigger } from "./kairaActivityPlanningTrigger";

const base = () => ({
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  activeExecutions: [] as any[],
  schedules: [] as any[],
  now: "2026-09-02T12:00:00.000Z",
});

describe("Kaira activity planning trigger contracts", () => {
  it("evaluates a real busy-to-idle transition", () => {
    const decision = evaluateKairaActivityPlanningTrigger({
      ...base(),
      trigger: {
        triggerId: "idle_1",
        kind: "idle_transition",
        sourceId: "presence_1",
        occurredAt: "2026-09-02T11:59:30.000Z",
        previousBusy: true,
        currentBusy: false,
      },
    });
    expect(decision.status).toBe("evaluate");
  });

  it("rejects synthetic idle and weak state/world noise", () => {
    const idle = evaluateKairaActivityPlanningTrigger({
      ...base(),
      trigger: {
        triggerId: "idle_2",
        kind: "idle_transition",
        sourceId: "presence_2",
        occurredAt: "2026-09-02T11:59:30.000Z",
        previousBusy: false,
        currentBusy: false,
      },
    });
    const state = evaluateKairaActivityPlanningTrigger({
      ...base(),
      trigger: {
        triggerId: "state_1",
        kind: "dynamic_state_change",
        sourceId: "state_commit_1",
        occurredAt: "2026-09-02T11:59:30.000Z",
        magnitude: 0.12,
      },
    });
    const world = evaluateKairaActivityPlanningTrigger({
      ...base(),
      trigger: {
        triggerId: "world_1",
        kind: "meaningful_world_change",
        sourceId: "world_event_1",
        occurredAt: "2026-09-02T11:59:30.000Z",
        materiality: 0.2,
      },
    });
    expect(idle).toMatchObject({ status: "suppressed", reason: "non_material_trigger" });
    expect(state).toMatchObject({ status: "suppressed", reason: "non_material_trigger" });
    expect(world).toMatchObject({ status: "suppressed", reason: "non_material_trigger" });
  });

  it("suppresses new planning while an execution is active", () => {
    const decision = evaluateKairaActivityPlanningTrigger({
      ...base(),
      activeExecutions: [{ phase: "active" }] as any[],
      trigger: {
        triggerId: "world_2",
        kind: "meaningful_world_change",
        sourceId: "world_event_2",
        occurredAt: "2026-09-02T11:59:30.000Z",
        materiality: 0.9,
      },
    });
    expect(decision).toMatchObject({ status: "suppressed", reason: "active_execution" });
  });

  it("suppresses planning shortly before canonical scheduled work", () => {
    const decision = evaluateKairaActivityPlanningTrigger({
      ...base(),
      schedules: [{ status: "scheduled", notBefore: "2026-09-02T12:10:00.000Z" }] as any[],
      trigger: {
        triggerId: "terminal_1",
        kind: "execution_terminal",
        sourceId: "activity_a",
        occurredAt: "2026-09-02T11:59:30.000Z",
        terminalPhase: "completed",
      },
    });
    expect(decision).toMatchObject({ status: "suppressed", reason: "upcoming_schedule" });
  });

  it("enforces a generic planning cooldown without activity-name rules", () => {
    const decision = evaluateKairaActivityPlanningTrigger({
      ...base(),
      lastPlanningEvaluationAt: "2026-09-02T11:52:00.000Z",
      trigger: {
        triggerId: "state_2",
        kind: "dynamic_state_change",
        sourceId: "state_commit_2",
        occurredAt: "2026-09-02T11:59:30.000Z",
        magnitude: 0.8,
      },
    });
    expect(decision).toMatchObject({ status: "suppressed", reason: "planning_cooldown" });
  });

  it("blocks Welcome Kaira and stale/future triggers", () => {
    const welcome = evaluateKairaActivityPlanningTrigger({
      ...base(),
      kairaInstanceId: "welcome_a",
      instanceType: "welcome",
      trigger: {
        triggerId: "idle_3",
        kind: "idle_transition",
        sourceId: "presence_3",
        occurredAt: "2026-09-02T11:59:30.000Z",
        previousBusy: true,
        currentBusy: false,
      },
    });
    const future = evaluateKairaActivityPlanningTrigger({
      ...base(),
      trigger: {
        triggerId: "world_3",
        kind: "meaningful_world_change",
        sourceId: "world_event_3",
        occurredAt: "2026-09-02T12:05:00.000Z",
        materiality: 0.9,
      },
    });
    expect(welcome).toMatchObject({ status: "suppressed", reason: "autonomous_activity_planning_disabled" });
    expect(future).toMatchObject({ status: "suppressed", reason: "invalid_or_future_trigger" });
  });
});
