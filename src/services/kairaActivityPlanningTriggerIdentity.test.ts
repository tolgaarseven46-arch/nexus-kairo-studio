import { describe, expect, it } from "vitest";
import {
  sameKairaActivityPlanningTrigger,
  type KairaActivityPlanningTrigger,
} from "./kairaActivityPlanningTrigger";

describe("Kaira activity planning trigger semantic identity", () => {
  it("treats Firestore map property order as irrelevant", () => {
    const first: KairaActivityPlanningTrigger = {
      triggerId: "WORLD:42",
      kind: "meaningful_world_change",
      sourceId: "EVENT:9",
      occurredAt: "2026-09-04T16:00:00.000Z",
      materiality: 0.8,
    };
    const reordered = {
      materiality: 0.8,
      occurredAt: "2026-09-04T16:00:00Z",
      sourceId: "event:9",
      kind: "meaningful_world_change",
      triggerId: "world:42",
    } as KairaActivityPlanningTrigger;

    expect(JSON.stringify(first)).not.toBe(JSON.stringify(reordered));
    expect(sameKairaActivityPlanningTrigger(first, reordered)).toBe(true);
  });

  it("keeps a real trigger-field change as an idempotency conflict", () => {
    const first: KairaActivityPlanningTrigger = {
      triggerId: "world:42",
      kind: "meaningful_world_change",
      sourceId: "event:9",
      occurredAt: "2026-09-04T16:00:00.000Z",
      materiality: 0.8,
    };
    const changed: KairaActivityPlanningTrigger = {
      ...first,
      materiality: 0.9,
    };

    expect(sameKairaActivityPlanningTrigger(first, changed)).toBe(false);
  });

  it("compares every trigger kind by its typed payload", () => {
    const idle: KairaActivityPlanningTrigger = {
      triggerId: "idle:1",
      kind: "idle_transition",
      sourceId: "execution:1",
      occurredAt: "2026-09-04T16:00:00.000Z",
      previousBusy: true,
      currentBusy: false,
    };
    const terminal: KairaActivityPlanningTrigger = {
      triggerId: "execution:1",
      kind: "execution_terminal",
      sourceId: "execution:1",
      occurredAt: "2026-09-04T16:00:00.000Z",
      terminalPhase: "completed",
    };
    const dynamic: KairaActivityPlanningTrigger = {
      triggerId: "dynamic:1",
      kind: "dynamic_state_change",
      sourceId: "state:1",
      occurredAt: "2026-09-04T16:00:00.000Z",
      magnitude: 0.6,
    };

    expect(sameKairaActivityPlanningTrigger(idle, { ...idle })).toBe(true);
    expect(sameKairaActivityPlanningTrigger(idle, { ...idle, previousBusy: false })).toBe(false);
    expect(sameKairaActivityPlanningTrigger(terminal, { ...terminal })).toBe(true);
    expect(sameKairaActivityPlanningTrigger(terminal, { ...terminal, terminalPhase: "failed" })).toBe(false);
    expect(sameKairaActivityPlanningTrigger(dynamic, { ...dynamic })).toBe(true);
    expect(sameKairaActivityPlanningTrigger(dynamic, { ...dynamic, magnitude: 0.7 })).toBe(false);
  });
});
