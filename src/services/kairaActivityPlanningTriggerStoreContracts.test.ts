import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = { get: vi.fn(), set: vi.fn() };
  return {
    transaction,
    doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
    runTransaction: vi.fn(async (_db: unknown, callback: (tx: typeof transaction) => unknown) => callback(transaction)),
  };
});

vi.mock("firebase/firestore", () => ({ doc: mocks.doc, runTransaction: mocks.runTransaction }));
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import {
  claimKairaActivityPlanningTrigger,
  completeKairaActivityPlanningTrigger,
  type KairaActivityPlanningTriggerReceipt,
} from "./kairaActivityPlanningTriggerStore";

const trigger = {
  triggerId: "idle_1",
  kind: "idle_transition" as const,
  sourceId: "presence_1",
  occurredAt: "2026-09-02T11:59:30.000Z",
  previousBusy: true,
  currentBusy: false as const,
};

const receipt = (overrides: Partial<KairaActivityPlanningTriggerReceipt> = {}): KairaActivityPlanningTriggerReceipt => ({
  schemaVersion: 1,
  kairaInstanceId: "kaira_a",
  instanceType: "individual",
  triggerId: "idle_1",
  triggerKind: "idle_transition",
  sourceId: "presence_1",
  occurredAt: "2026-09-02T11:59:30.000Z",
  status: "claimed",
  claimedAt: "2026-09-02T12:00:00.000Z",
  leaseUntil: "2026-09-02T12:05:00.000Z",
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity planning trigger store contracts", () => {
  it("claims a new canonical trigger exactly once", async () => {
    mocks.transaction.get.mockResolvedValue({ exists: () => false });
    const result = await claimKairaActivityPlanningTrigger({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      trigger,
      now: "2026-09-02T12:00:00.000Z",
    });
    expect(result.status).toBe("claimed");
    expect(mocks.transaction.set).toHaveBeenCalledOnce();
  });

  it("returns busy while the existing lease is live", async () => {
    mocks.transaction.get.mockResolvedValue({ exists: () => true, data: () => receipt() });
    const result = await claimKairaActivityPlanningTrigger({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      trigger,
      now: "2026-09-02T12:02:00.000Z",
    });
    expect(result.status).toBe("busy");
    expect(mocks.transaction.set).not.toHaveBeenCalled();
  });

  it("reclaims an expired lease instead of permanently losing the trigger", async () => {
    mocks.transaction.get.mockResolvedValue({ exists: () => true, data: () => receipt() });
    const result = await claimKairaActivityPlanningTrigger({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      trigger,
      now: "2026-09-02T12:06:00.000Z",
    });
    expect(result.status).toBe("reclaimed");
    expect(mocks.transaction.set).toHaveBeenCalledOnce();
  });

  it("replays a completed trigger and rejects semantic id collisions", async () => {
    mocks.transaction.get.mockResolvedValue({
      exists: () => true,
      data: () => receipt({ status: "completed", completedAt: "2026-09-02T12:01:00.000Z" }),
    });
    await expect(claimKairaActivityPlanningTrigger({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      trigger,
      now: "2026-09-02T12:02:00.000Z",
    })).resolves.toMatchObject({ status: "replayed" });

    mocks.transaction.get.mockResolvedValue({ exists: () => true, data: () => receipt({ sourceId: "other_source" }) });
    await expect(claimKairaActivityPlanningTrigger({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      trigger,
      now: "2026-09-02T12:02:00.000Z",
    })).rejects.toThrow("idempotency conflict");
  });

  it("completes an owned claim idempotently", async () => {
    mocks.transaction.get.mockResolvedValue({ exists: () => true, data: () => receipt() });
    const completed = await completeKairaActivityPlanningTrigger({
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      trigger,
      now: "2026-09-02T12:03:00.000Z",
    });
    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBe("2026-09-02T12:03:00.000Z");
  });

  it("blocks Welcome Kaira before touching Firestore", async () => {
    await expect(claimKairaActivityPlanningTrigger({
      kairaInstanceId: "welcome_a",
      instanceType: "welcome",
      trigger,
      now: "2026-09-02T12:00:00.000Z",
    })).rejects.toThrow("cannot own planning triggers");
    expect(mocks.runTransaction).not.toHaveBeenCalled();
  });
});
