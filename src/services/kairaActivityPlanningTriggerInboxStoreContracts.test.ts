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
} from "./kairaActivityPlanningTriggerInboxStore";

const trigger = {
  triggerId: " Execution Done 01 ",
  kind: "execution_terminal" as const,
  sourceId: " Theatre 01 ",
  occurredAt: "2026-09-02T02:00:00Z",
  terminalPhase: "completed" as const,
};

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
      trigger: {
        triggerId: "execution_done_01",
        sourceId: "theatre_01",
        occurredAt: "2026-09-02T02:00:00.000Z",
      },
      enqueuedAt: "2026-09-02T02:00:01.000Z",
    });
    expect(set).toHaveBeenCalledOnce();

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => result.record }),
        set: vi.fn(),
      }),
    );
    await expect(enqueueKairaActivityPlanningTriggerAtomic(input)).resolves.toEqual({
      status: "replayed",
      record: result.record,
    });
  });

  it("rejects welcome ownership and same-id semantic conflicts", async () => {
    await expect(enqueueKairaActivityPlanningTriggerAtomic({
      ownerUserId: "owner_1",
      kairaInstanceId: "welcome_1",
      instanceType: "welcome",
      trigger,
      now: "2026-09-02T02:00:01Z",
    })).rejects.toThrow("cannot own planning trigger inbox");

    const existing = {
      schemaVersion: 1 as const,
      ownerUserId: "owner_1",
      kairaInstanceId: "Kaira_A",
      instanceType: "individual" as const,
      trigger: { ...trigger, triggerId: "execution_done_01", sourceId: "theatre_01", occurredAt: "2026-09-02T02:00:00.000Z" },
      status: "pending" as const,
      enqueuedAt: "2026-09-02T02:00:01.000Z",
    };
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => existing }), set: vi.fn() }),
    );
    await expect(enqueueKairaActivityPlanningTriggerAtomic({
      ownerUserId: "other_owner",
      kairaInstanceId: "Kaira A",
      instanceType: "individual",
      trigger,
      now: "2026-09-02T02:00:02Z",
    })).rejects.toThrow("idempotency conflict");
  });

  it("discovers only valid pending rows through a bounded status query", async () => {
    const valid = {
      schemaVersion: 1 as const,
      ownerUserId: "owner_1",
      kairaInstanceId: "Kaira_A",
      instanceType: "individual" as const,
      trigger: { ...trigger, triggerId: "execution_done_01", sourceId: "theatre_01", occurredAt: "2026-09-02T02:00:00.000Z" },
      status: "pending" as const,
      enqueuedAt: "2026-09-02T02:00:01.000Z",
    };
    firestore.getDocs.mockResolvedValue({
      docs: [
        { data: () => valid },
        { data: () => ({ ...valid, schemaVersion: 2 }) },
        { data: () => ({ ...valid, status: "consumed", consumedAt: "2026-09-02T02:01:00Z" }) },
      ],
    });
    const result = await listPendingKairaActivityPlanningTriggers({ batchSize: 999 });
    expect(firestore.where).toHaveBeenCalledWith("status", "==", "pending");
    expect(firestore.limit).toHaveBeenCalledWith(100);
    expect(result).toHaveLength(1);
    expect(result[0].trigger.triggerId).toBe("execution_done_01");
  });

  it("marks delivery consumed atomically and replays an already consumed record", async () => {
    const pending = {
      schemaVersion: 1 as const,
      ownerUserId: "owner_1",
      kairaInstanceId: "Kaira_A",
      instanceType: "individual" as const,
      trigger: { ...trigger, triggerId: "execution_done_01", sourceId: "theatre_01", occurredAt: "2026-09-02T02:00:00.000Z" },
      status: "pending" as const,
      enqueuedAt: "2026-09-02T02:00:01.000Z",
    };
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => pending }), set }),
    );
    const consumed = await markKairaActivityPlanningTriggerConsumedAtomic({
      record: pending,
      now: "2026-09-02T02:05:00Z",
    });
    expect(consumed).toMatchObject({ status: "consumed", consumedAt: "2026-09-02T02:05:00.000Z" });
    expect(set).toHaveBeenCalledOnce();

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => consumed }), set: vi.fn() }),
    );
    await expect(markKairaActivityPlanningTriggerConsumedAtomic({
      record: pending,
      now: "2026-09-02T02:06:00Z",
    })).resolves.toEqual(consumed);
  });
});
