import { beforeEach, describe, expect, it, vi } from "vitest";

const inbox = vi.hoisted(() => ({ list: vi.fn(), consume: vi.fn() }));
const sources = vi.hoisted(() => ({ read: vi.fn() }));
const planning = vi.hoisted(() => ({ commit: vi.fn() }));

vi.mock("./kairaActivityPlanningTriggerInboxStore", () => ({
  listPendingKairaActivityPlanningTriggers: inbox.list,
  markKairaActivityPlanningTriggerConsumedAtomic: inbox.consume,
}));
vi.mock("./kairaActivityPlanningSourceSnapshot", () => ({
  readKairaActivityPlanningSourceSnapshot: sources.read,
}));
vi.mock("./kairaActivityPlanningCommitCoordinator", () => ({
  evaluateAndCommitKairaActivityPlanningTrigger: planning.commit,
}));

import { processPendingKairaActivityPlanningTriggers } from "./kairaActivityPlanningTriggerInboxProcessor";

const record = (id: string) => ({
  schemaVersion: 1 as const,
  ownerUserId: "owner_1",
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  trigger: {
    triggerId: id,
    kind: "execution_terminal" as const,
    sourceId: `activity:${id}`,
    occurredAt: "2026-09-02T02:00:00.000Z",
    terminalPhase: "completed" as const,
  },
  status: "pending" as const,
  enqueuedAt: "2026-09-02T02:00:01.000Z",
});

const ready = {
  status: "ready" as const,
  catalogVersion: "v1",
  catalog: [],
  environment: { schemaVersion: 1, kairaInstanceId: "kaira_a", observedAt: "2026-09-02T02:00:00.000Z", entries: [] },
  activeExecutions: [],
  schedules: [],
  dynamicState: { calmness: 70, anger: 10, stress: 20, happiness: 70, confidence: 70, surprise: 10, lastStatus: "stable" },
};

beforeEach(() => {
  vi.clearAllMocks();
  inbox.consume.mockResolvedValue({ status: "consumed" });
  sources.read.mockResolvedValue(ready);
  planning.commit.mockResolvedValue({ status: "completed_none" });
});

describe("Kaira planning trigger inbox processor contracts", () => {
  it("consumes a trigger only after durable planning completion", async () => {
    inbox.list.mockResolvedValue([record("trigger_1")]);
    const result = await processPendingKairaActivityPlanningTriggers({
      now: "2026-09-02T02:05:00.000Z",
      batchSize: 10,
      occupancyBatchSize: 20,
    });
    expect(sources.read).toHaveBeenCalledWith({ record: record("trigger_1"), occupancyBatchSize: 20 });
    expect(planning.commit.mock.invocationCallOrder[0]).toBeLessThan(inbox.consume.mock.invocationCallOrder[0]);
    expect(result).toMatchObject({ discovered: 1, completed: 1, busy: 0, deferred: 0, failed: 0 });
  });

  it("leaves unavailable source work pending instead of inventing defaults", async () => {
    inbox.list.mockResolvedValue([record("trigger_1")]);
    sources.read.mockResolvedValue({ status: "unavailable", reason: "dynamic_state_missing" });
    const result = await processPendingKairaActivityPlanningTriggers({ now: "2026-09-02T02:05:00.000Z" });
    expect(planning.commit).not.toHaveBeenCalled();
    expect(inbox.consume).not.toHaveBeenCalled();
    expect(result.items[0]).toEqual({
      triggerId: "trigger_1",
      status: "deferred",
      reason: "dynamic_state_missing",
    });
  });

  it("leaves a busy trigger pending for the current owner to finish", async () => {
    inbox.list.mockResolvedValue([record("trigger_1")]);
    planning.commit.mockResolvedValue({ status: "busy" });
    const result = await processPendingKairaActivityPlanningTriggers({ now: "2026-09-02T02:05:00.000Z" });
    expect(inbox.consume).not.toHaveBeenCalled();
    expect(result.items[0]).toMatchObject({ status: "busy", outcome: "busy" });
  });

  it("isolates failures so one trigger cannot block another", async () => {
    inbox.list.mockResolvedValue([record("bad"), record("good")]);
    sources.read
      .mockRejectedValueOnce(new Error("bad source"))
      .mockResolvedValueOnce(ready);
    const result = await processPendingKairaActivityPlanningTriggers({ now: "2026-09-02T02:05:00.000Z" });
    expect(result).toMatchObject({ discovered: 2, completed: 1, failed: 1 });
    expect(result.items[0]).toMatchObject({ triggerId: "bad", status: "failed", error: "bad source" });
    expect(result.items[1]).toMatchObject({ triggerId: "good", status: "completed" });
    expect(inbox.consume).toHaveBeenCalledTimes(1);
  });
});
