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
  applyKairaActivityExecutionCommandAtomic,
  createKairaActivityExecutionAtomic,
  listOpenKairaActivityExecutions,
  transitionKairaActivityExecutionAtomic,
} from "./kairaActivityExecutionStore";

beforeEach(() => {
  vi.clearAllMocks();
});

const openExecution = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1 as const,
  ownerUserId: "owner_1",
  kairaInstanceId: "kaira_a",
  instanceType: "individual" as const,
  activityId: "theatre_01",
  activityType: "theatre",
  phase: "planned" as const,
  permissionPolicy: "none" as const,
  permissionStatus: "not_required" as const,
  createdAt: "2026-09-02T00:00:00.000Z",
  updatedAt: "2026-09-02T00:00:00.000Z",
  ...overrides,
});

describe("Kaira activity execution store contracts", () => {
  it("creates a canonical execution exactly once and returns the same record on retry", async () => {
    const set = vi.fn();
    const firstSnapshot = { exists: () => false };
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue(firstSnapshot), set }),
    );
    const input = {
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual" as const,
      activityId: "Theatre 01",
      activityType: "Theatre",
      experienceSubject: {
        preferenceKey: "preferred_performance_type",
        experiencedValue: "theatre",
      },
      permissionPolicy: "owner_approval" as const,
      now: "2026-09-02T00:00:00.000Z",
    };
    const created = await createKairaActivityExecutionAtomic(input);
    expect(created.status).toBe("created");
    expect(created.record).toMatchObject({
      ownerUserId: "owner_1",
      activityId: "theatre_01",
      activityType: "theatre",
      experienceSubject: input.experienceSubject,
      permissionStatus: "pending",
    });
    expect(set).toHaveBeenCalledTimes(1);

    const existing = created.record;
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => existing }),
        set: vi.fn(),
      }),
    );
    await expect(createKairaActivityExecutionAtomic(input)).resolves.toEqual({
      status: "existing",
      record: existing,
    });
  });

  it("discovers only canonical open executions for one owner and Kaira instance", async () => {
    firestore.getDocs.mockResolvedValue({
      docs: [
        { data: () => openExecution() },
        { data: () => openExecution({ activityId: "walk_01", phase: "active" }) },
        { data: () => openExecution({ activityId: "done_01", phase: "completed" }) },
        { data: () => openExecution({ ownerUserId: "other_owner", activityId: "foreign_01" }) },
      ],
    });

    const result = await listOpenKairaActivityExecutions({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      batchSize: 500,
    });

    expect(firestore.where).toHaveBeenCalledWith("ownerUserId", "==", "owner_1");
    expect(firestore.where).toHaveBeenCalledWith("kairaInstanceId", "==", "kaira_a");
    expect(firestore.where).toHaveBeenCalledWith("phase", "in", ["planned", "active"]);
    expect(firestore.limit).toHaveBeenCalledWith(100);
    expect(result.map((record) => record.activityId)).toEqual(["theatre_01", "walk_01"]);
  });

  it("fails closed when a retry reuses the same activity id with different semantics", async () => {
    const existing = {
      schemaVersion: 1 as const,
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual" as const,
      activityId: "theatre_01",
      activityType: "theatre",
      experienceSubject: {
        preferenceKey: "preferred_performance_type",
        experiencedValue: "theatre",
      },
      phase: "planned" as const,
      permissionPolicy: "none" as const,
      permissionStatus: "not_required" as const,
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
    };
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => existing }), set: vi.fn() }),
    );
    await expect(
      createKairaActivityExecutionAtomic({
        ownerUserId: "owner_1",
        kairaInstanceId: "kaira_a",
        instanceType: "individual",
        activityId: "theatre_01",
        activityType: "concert",
        experienceSubject: existing.experienceSubject,
        now: "2026-09-02T00:00:01.000Z",
      }),
    ).rejects.toThrow("idempotency conflict");
  });

  it("does not allow experience subject mutation after planning", async () => {
    const existing = {
      schemaVersion: 1 as const,
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual" as const,
      activityId: "theatre_01",
      activityType: "theatre",
      experienceSubject: {
        preferenceKey: "preferred_performance_type",
        experiencedValue: "theatre",
      },
      phase: "planned" as const,
      permissionPolicy: "none" as const,
      permissionStatus: "not_required" as const,
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
    };
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => existing }), set: vi.fn() }),
    );
    await expect(createKairaActivityExecutionAtomic({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      activityId: "theatre_01",
      activityType: "theatre",
      experienceSubject: {
        preferenceKey: "preferred_food",
        experiencedValue: "pizza",
      },
      now: "2026-09-02T00:00:01.000Z",
    })).rejects.toThrow("idempotency conflict");
  });

  it("transitions inside one Firestore transaction and persists only applied decisions", async () => {
    const record = openExecution();
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => record }), set }),
    );
    const result = await transitionKairaActivityExecutionAtomic({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      command: { type: "start", authority: "kaira_activity_executor" },
      now: "2026-09-02T00:01:00.000Z",
    });
    expect(result.status).toBe("applied");
    expect(set).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ phase: "active" }));
  });

  it("does not write a rejected transition", async () => {
    const record = openExecution({ permissionPolicy: "owner_approval", permissionStatus: "pending" });
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => record }), set }),
    );
    const result = await transitionKairaActivityExecutionAtomic({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      command: { type: "start", authority: "kaira_activity_executor" },
      now: "2026-09-02T00:01:00.000Z",
    });
    expect(result).toMatchObject({ status: "rejected", reason: "permission_required" });
    expect(set).not.toHaveBeenCalled();
  });

  it("replays only the exact command result and does not reopen a different terminal state", async () => {
    const completed = openExecution({
      phase: "completed",
      updatedAt: "2026-09-02T00:20:00.000Z",
      completedAt: "2026-09-02T00:20:00.000Z",
    });
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => completed }), set: vi.fn() }),
    );
    await expect(applyKairaActivityExecutionCommandAtomic({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      command: { type: "complete", authority: "kaira_activity_executor" },
      now: "2026-09-02T00:21:00.000Z",
    })).resolves.toEqual({ status: "replayed", record: completed });

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => completed }), set: vi.fn() }),
    );
    await expect(applyKairaActivityExecutionCommandAtomic({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      command: { type: "cancel", authority: "kaira_activity_executor" },
      now: "2026-09-02T00:22:00.000Z",
    })).resolves.toMatchObject({ status: "rejected", reason: "terminal_activity" });
  });
});
