import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import {
  commitKairaActivityScheduleDispatchAtomic,
  createKairaActivityScheduleAtomic,
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
