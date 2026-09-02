import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  collection: vi.fn((_db: unknown, name: string) => ({ name })),
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn((value: number) => ({ kind: "limit", value })),
  query: vi.fn((...parts: unknown[]) => ({ parts })),
  runTransaction: vi.fn(),
  where: vi.fn((field: string, op: string, value: unknown) => ({ kind: "where", field, op, value })),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import {
  commitKairaActivityScheduleDispatchAtomic,
  createKairaActivityScheduleAtomic,
  listDueKairaActivitySchedules,
  listScheduledKairaActivitySchedules,
  listScheduledKairaActivitySchedulesForInstance,
} from "./kairaActivityScheduleStore";

beforeEach(() => vi.clearAllMocks());

const existing = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1 as const,
  ownerUserId: "owner_1",
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  activityId: "theatre_01",
  notBefore: "2026-09-02T01:00:00.000Z",
  expiresAt: "2026-09-02T02:00:00.000Z",
  status: "scheduled" as const,
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
  ...overrides,
});

describe("Kaira activity schedule store contracts", () => {
  it("creates once and returns exact existing schedule on retry", async () => {
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => false }), set }),
    );
    const input = {
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual" as const,
      activityId: "theatre_01",
      notBefore: "2026-09-02T01:00:00.000Z",
      expiresAt: "2026-09-02T02:00:00.000Z",
      now: "2026-09-02T00:00:00.000Z",
    };
    const created = await createKairaActivityScheduleAtomic(input);
    expect(created.status).toBe("created");
    expect(set).toHaveBeenCalledTimes(1);

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => created.record }), set: vi.fn() }),
    );
    await expect(createKairaActivityScheduleAtomic(input)).resolves.toEqual({ status: "existing", record: created.record });
  });

  it("fails closed when the same activity schedule id is reused with a different trigger time", async () => {
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => existing() }), set: vi.fn() }),
    );
    await expect(createKairaActivityScheduleAtomic({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      activityId: "theatre_01",
      notBefore: "2026-09-02T01:30:00.000Z",
      expiresAt: "2026-09-02T02:00:00.000Z",
      now: "2026-09-02T00:00:00.000Z",
    })).rejects.toThrow("idempotency conflict");
  });

  it("lists scheduled records through a bounded canonical status query and filters malformed rows", async () => {
    firestore.getDocs.mockResolvedValue({
      docs: [
        { data: () => existing() },
        { data: () => ({ status: "scheduled", activityId: "bad" }) },
      ],
    });

    const result = await listScheduledKairaActivitySchedules({ batchSize: 500 });

    expect(firestore.where).toHaveBeenCalledWith("status", "==", "scheduled");
    expect(firestore.limit).toHaveBeenCalledWith(100);
    expect(result).toEqual([existing()]);
  });

  it("scopes planning schedule snapshots to one owner and Kaira instance", async () => {
    firestore.getDocs.mockResolvedValue({
      docs: [
        { data: () => existing() },
        { data: () => existing({ ownerUserId: "other_owner", activityId: "foreign_owner" }) },
        { data: () => existing({ kairaInstanceId: "kaira_b", activityId: "foreign_kaira" }) },
        { data: () => existing({ status: "dispatched", activityId: "already_dispatched" }) },
      ],
    });

    const result = await listScheduledKairaActivitySchedulesForInstance({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      batchSize: 500,
    });

    expect(firestore.where).toHaveBeenCalledWith("ownerUserId", "==", "owner_1");
    expect(firestore.where).toHaveBeenCalledWith("kairaInstanceId", "==", "kaira_a");
    expect(firestore.where).toHaveBeenCalledWith("status", "==", "scheduled");
    expect(firestore.limit).toHaveBeenCalledWith(100);
    expect(result).toEqual([existing()]);
  });

  it("discovers only schedules due by canonical worker time", async () => {
    firestore.getDocs.mockResolvedValue({ docs: [{ data: () => existing() }] });

    await expect(listDueKairaActivitySchedules({
      now: "2026-09-02T01:05:00Z",
      batchSize: 10,
    })).resolves.toEqual([existing()]);

    expect(firestore.where).toHaveBeenCalledWith("status", "==", "scheduled");
    expect(firestore.where).toHaveBeenCalledWith("notBefore", "<=", "2026-09-02T01:05:00.000Z");
    expect(firestore.limit).toHaveBeenCalledWith(10);
  });

  it("rejects invalid due-discovery time before Firestore query", async () => {
    await expect(listDueKairaActivitySchedules({ now: "bad-time" })).rejects.toThrow("discovery time");
    expect(firestore.getDocs).not.toHaveBeenCalled();
  });

  it("commits dispatch atomically only when due", async () => {
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => existing() }), set }),
    );
    const result = await commitKairaActivityScheduleDispatchAtomic({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      now: "2026-09-02T01:00:00.000Z",
    });
    expect(result.status).toBe("dispatched");
    expect(set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: "dispatched" }));
  });

  it("persists expired state instead of repeatedly leaving stale work scheduled", async () => {
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => existing() }), set }),
    );
    const result = await commitKairaActivityScheduleDispatchAtomic({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      now: "2026-09-02T02:05:00.000Z",
    });
    expect(result.status).toBe("expired");
    expect(result.record.status).toBe("expired");
    expect(set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: "expired" }));
  });
});
