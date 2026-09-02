import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDocs: vi.fn(),
  limit: vi.fn((value: number) => ({ kind: "limit", value })),
  query: vi.fn((...parts: unknown[]) => ({ parts })),
  runTransaction: vi.fn(),
  where: vi.fn((field: string, op: string, value: unknown) => ({ kind: "where", field, op, value })),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import {
  enqueueKairaActivityPlanningTriggerAtomic,
  listPendingKairaActivityPlanningTriggers,
  markKairaActivityPlanningTriggerConsumedAtomic,
  markKairaActivityPlanningTriggerDeferredAtomic,
} from "./kairaActivityPlanningTriggerInboxStore";

const trigger = {
  triggerId: " Execution Done 01 ",
  kind: "execution_terminal" as const,
  sourceId: " Theatre 01 ",
  occurredAt: "2026-09-02T02:00:00Z",
  terminalPhase: "completed" as const,
};

const pending = () => ({
  schemaVersion: 1 as const,
  ownerUserId: "owner_1",
  kairaInstanceId: "Kaira_A",
  instanceType: "individual" as const,
  trigger: { ...trigger, triggerId: "execution_done_01", sourceId: "theatre_01", occurredAt: "2026-09-02T02:00:00.000Z" },
  status: "pending" as const,
  enqueuedAt: "2026-09-02T02:00:01.000Z",
  attemptCount: 0,
});

beforeEach(() => vi.clearAllMocks());

describe("Kaira planning trigger inbox store contracts", () => {
  it("enqueues canonical durable work exactly once", async () => {
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => false }), set }),
    );
    const input = {
      ownerUserId: "owner_1",
      kairaInstanceId: "Kaira A",
      instanceType: "individual" as const,
      trigger,
      now: "2026-09-02T02:00:01Z",
    };
    const result = await enqueueKairaActivityPlanningTriggerAtomic(input);
    expect(result.status).toBe("enqueued");
    expect(result.record).toMatchObject({
      ownerUserId: "owner_1",
      kairaInstanceId: "Kaira_A",
      instanceType: "individual",
      status: "pending",
      attemptCount: 0,
      trigger: {
        triggerId: "execution_done_01",
        sourceId: "theatre_01",
        occurredAt: "2026-09-02T02:00:00.000Z",
      },
      enqueuedAt: "2026-09-02T02:00:01.000Z",
    });
    expect(set).toHaveBeenCalledOnce();

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => result.record }), set: vi.fn() }),
    );
    await expect(enqueueKairaActivityPlanningTriggerAtomic(input)).resolves.toEqual({ status: "replayed", record: result.record });
  });

  it("rejects welcome ownership and same-id semantic conflicts", async () => {
    await expect(enqueueKairaActivityPlanningTriggerAtomic({
      ownerUserId: "owner_1", kairaInstanceId: "welcome_1", instanceType: "welcome", trigger, now: "2026-09-02T02:00:01Z",
    })).rejects.toThrow("cannot own planning trigger inbox");

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: pending }), set: vi.fn() }),
    );
    await expect(enqueueKairaActivityPlanningTriggerAtomic({
      ownerUserId: "other_owner", kairaInstanceId: "Kaira A", instanceType: "individual", trigger, now: "2026-09-02T02:00:02Z",
    })).rejects.toThrow("idempotency conflict");
  });

  it("discovers pending and only due deferred rows through bounded queries", async () => {
    const deferred = {
      ...pending(),
      status: "deferred" as const,
      deferredAt: "2026-09-02T02:01:00.000Z",
      retryAfter: "2026-09-02T02:02:00.000Z",
      attemptCount: 1,
    };
    firestore.getDocs
      .mockResolvedValueOnce({ docs: [{ data: pending }] })
      .mockResolvedValueOnce({ docs: [{ data: () => deferred }] });

    const result = await listPendingKairaActivityPlanningTriggers({
      batchSize: 999,
      now: "2026-09-02T02:05:00Z",
    });
    expect(firestore.where).toHaveBeenCalledWith("status", "==", "pending");
    expect(firestore.where).toHaveBeenCalledWith("status", "==", "deferred");
    expect(firestore.where).toHaveBeenCalledWith("retryAfter", "<=", "2026-09-02T02:05:00.000Z");
    expect(firestore.limit).toHaveBeenCalledWith(100);
    expect(result).toHaveLength(2);
  });

  it("backs unavailable work off exponentially instead of leaving it hot-pending", async () => {
    const current = pending();
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => current }), set }),
    );
    const deferred = await markKairaActivityPlanningTriggerDeferredAtomic({
      record: current,
      now: "2026-09-02T02:05:00Z",
    });
    expect(deferred).toMatchObject({
      status: "deferred",
      attemptCount: 1,
      deferredAt: "2026-09-02T02:05:00.000Z",
      retryAfter: "2026-09-02T02:06:00.000Z",
    });
    expect(set).toHaveBeenCalledOnce();
    expect(set.mock.calls[0][1]).not.toHaveProperty("consumedAt");

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => deferred }), set: vi.fn() }),
    );
    const deferredAgain = await markKairaActivityPlanningTriggerDeferredAtomic({
      record: deferred,
      now: "2026-09-02T02:06:00Z",
    });
    expect(deferredAgain.attemptCount).toBe(2);
    expect(deferredAgain.retryAfter).toBe("2026-09-02T02:08:00.000Z");
  });

  it("marks deferred or pending delivery consumed atomically and clears retry fields", async () => {
    const deferred = {
      ...pending(),
      status: "deferred" as const,
      deferredAt: "2026-09-02T02:01:00.000Z",
      retryAfter: "2026-09-02T02:02:00.000Z",
      attemptCount: 1,
    };
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => deferred }), set }),
    );
    const consumed = await markKairaActivityPlanningTriggerConsumedAtomic({
      record: deferred,
      now: "2026-09-02T02:05:00Z",
    });
    expect(consumed).toMatchObject({ status: "consumed", consumedAt: "2026-09-02T02:05:00.000Z" });
    expect(consumed.retryAfter).toBeUndefined();
    expect(consumed.deferredAt).toBeUndefined();
    expect(set).toHaveBeenCalledOnce();
    expect(set.mock.calls[0][1]).not.toHaveProperty("deferredAt");
    expect(set.mock.calls[0][1]).not.toHaveProperty("retryAfter");
  });
});
