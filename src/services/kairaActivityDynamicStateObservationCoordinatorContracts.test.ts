import { beforeEach, describe, expect, it, vi } from "vitest";

const stateStore = vi.hoisted(() => ({ save: vi.fn() }));
const inbox = vi.hoisted(() => ({ enqueue: vi.fn() }));

vi.mock("./kairaActivityDynamicStateStore", () => ({
  saveKairaActivityDynamicStateAtomic: stateStore.save,
}));
vi.mock("./kairaActivityPlanningTriggerInboxStore", () => ({
  enqueueKairaActivityPlanningTriggerAtomic: inbox.enqueue,
}));

import {
  kairaActivityDynamicStateMagnitude,
  observeKairaActivityDynamicState,
} from "./kairaActivityDynamicStateObservationCoordinator";

const state = (anger: number) => ({
  calmness: 70,
  anger,
  stress: 20,
  happiness: 70,
  confidence: 70,
  surprise: 10,
  lastStatus: "stable",
});

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity dynamic state observation coordinator contracts", () => {
  it("computes normalized maximum axis movement without deciding materiality", () => {
    expect(kairaActivityDynamicStateMagnitude(state(10), { ...state(45), stress: 40 })).toBe(0.35);
  });

  it("does not emit a planning trigger for first, stale or replayed observations", async () => {
    for (const saved of [
      {
        status: "saved" as const,
        snapshot: {
          schemaVersion: 1 as const,
          kairaInstanceId: "kaira_a",
          instanceType: "individual" as const,
          state: state(20),
          observedAt: "2026-09-02T02:10:00.000Z",
          sourceId: "chat:turn_1",
        },
      },
      {
        status: "stale" as const,
        snapshot: {
          schemaVersion: 1 as const,
          kairaInstanceId: "kaira_a",
          instanceType: "individual" as const,
          state: state(20),
          observedAt: "2026-09-02T02:10:00.000Z",
          sourceId: "chat:turn_1",
        },
      },
      {
        status: "replayed" as const,
        snapshot: {
          schemaVersion: 1 as const,
          kairaInstanceId: "kaira_a",
          instanceType: "individual" as const,
          state: state(20),
          observedAt: "2026-09-02T02:10:00.000Z",
          sourceId: "chat:turn_1",
        },
      },
    ]) {
      vi.clearAllMocks();
      stateStore.save.mockResolvedValue(saved);
      const result = await observeKairaActivityDynamicState({
        ownerUserId: "owner_1",
        kairaInstanceId: "kaira_a",
        instanceType: "individual",
        state: state(20),
        observedAt: "2026-09-02T02:10:00.000Z",
        sourceId: "chat:turn_1",
      });
      expect(result.planningTriggerInbox).toBeNull();
      expect(inbox.enqueue).not.toHaveBeenCalled();
    }
  });

  it("persists state before emitting a durable magnitude trigger", async () => {
    stateStore.save.mockResolvedValue({
      status: "saved",
      previous: {
        schemaVersion: 1,
        kairaInstanceId: "kaira_a",
        instanceType: "individual",
        state: state(10),
        observedAt: "2026-09-02T02:00:00.000Z",
        sourceId: "chat:turn_1",
      },
      snapshot: {
        schemaVersion: 1,
        kairaInstanceId: "kaira_a",
        instanceType: "individual",
        state: state(45),
        observedAt: "2026-09-02T02:10:00.000Z",
        sourceId: "chat:turn_2",
      },
    });
    inbox.enqueue.mockResolvedValue({ status: "enqueued", record: { status: "pending" } });

    await observeKairaActivityDynamicState({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      state: state(45),
      observedAt: "2026-09-02T02:10:00.000Z",
      sourceId: "chat:turn_2",
    });

    expect(stateStore.save.mock.invocationCallOrder[0]).toBeLessThan(inbox.enqueue.mock.invocationCallOrder[0]);
    expect(inbox.enqueue).toHaveBeenCalledWith({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      trigger: {
        triggerId: "dynamic_state:chat:turn_2",
        kind: "dynamic_state_change",
        sourceId: "chat:turn_2",
        occurredAt: "2026-09-02T02:10:00.000Z",
        magnitude: 0.35,
      },
      now: "2026-09-02T02:10:00.000Z",
    });
  });
});
