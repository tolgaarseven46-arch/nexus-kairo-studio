import { beforeEach, describe, expect, it, vi } from "vitest";

const stateStore = vi.hoisted(() => ({ save: vi.fn() }));
const inbox = vi.hoisted(() => ({ enqueue: vi.fn() }));

vi.mock("./kairaActivityDynamicStateStore", () => ({
  saveKairaActivityDynamicStateAtomic: stateStore.save,
  kairaActivityDynamicStateMagnitude: vi.fn(),
}));
vi.mock("./kairaActivityPlanningTriggerInboxStore", () => ({
  enqueueKairaActivityPlanningTriggerAtomic: inbox.enqueue,
}));

import { observeKairaActivityDynamicState } from "./kairaActivityDynamicStateObservationCoordinator";

const state = (anger: number) => ({
  calmness: 70, anger, stress: 20, happiness: 70, confidence: 70, surprise: 10, lastStatus: "stable",
});
const snapshot = (changeMagnitude?: number) => ({
  schemaVersion: 1 as const,
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  state: state(45),
  observedAt: "2026-09-02T02:10:00.000Z",
  sourceId: "chat:turn_2",
  ...(changeMagnitude !== undefined ? { changeMagnitude } : {}),
});

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity dynamic state observation coordinator contracts", () => {
  it("does not emit for first or stale observations", async () => {
    for (const saved of [
      { status: "saved" as const, snapshot: snapshot() },
      { status: "stale" as const, snapshot: snapshot(0.35) },
    ]) {
      vi.clearAllMocks();
      stateStore.save.mockResolvedValue(saved);
      const result = await observeKairaActivityDynamicState({
        ownerUserId: "owner_1", kairaInstanceId: "kaira_a", instanceType: "individual",
        state: state(45), observedAt: "2026-09-02T02:10:00.000Z", sourceId: "chat:turn_2",
      });
      expect(result.planningTriggerInbox).toBeNull();
      expect(inbox.enqueue).not.toHaveBeenCalled();
    }
  });

  it.each(["saved", "replayed"] as const)("emits the persisted magnitude trigger for %s delivery", async (status) => {
    stateStore.save.mockResolvedValue({ status, snapshot: snapshot(0.35) });
    inbox.enqueue.mockResolvedValue({ status: status === "saved" ? "enqueued" : "replayed", record: { status: "pending" } });

    await observeKairaActivityDynamicState({
      ownerUserId: "owner_1", kairaInstanceId: "kaira_a", instanceType: "individual",
      state: state(45), observedAt: "2026-09-02T02:12:00.000Z", sourceId: "chat:turn_2",
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
