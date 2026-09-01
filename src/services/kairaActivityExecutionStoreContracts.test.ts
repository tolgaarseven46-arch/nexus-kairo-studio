import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  runTransaction: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import {
  applyKairaActivityExecutionCommandAtomic,
  createKairaActivityExecutionAtomic,
  transitionKairaActivityExecutionAtomic,
} from "./kairaActivityExecutionStore";

beforeEach(() => {
  vi.clearAllMocks();
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
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => existing }),
        set: vi.fn(),
      }),
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
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => existing }),
        set: vi.fn(),
      }),
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
    const record = {
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
    };
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => record }),
        set,
      }),
    );
    const result = await transitionKairaActivityExecutionAtomic({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      command: { type: "start", authority: "kaira_activity_executor" },
      now: "2026-09-02T00:01:00.000Z",
    });
    expect(result.status).toBe("applied");
    expect(set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ phase: "active" }),
    );
  });

  it("does not write a rejected transition", async () => {
    const record = {
      schemaVersion: 1 as const,
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual" as const,
      activityId: "theatre_01",
      activityType: "theatre",
      phase: "planned" as const,
      permissionPolicy: "owner_approval" as const,
      permissionStatus: "pending" as const,
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
    };
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => record }),
        set,
      }),
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
    const completed = {
      schemaVersion: 1 as const,
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual" as const,
      activityId: "theatre_01",
      activityType: "theatre",
      phase: "completed" as const,
      permissionPolicy: "none" as const,
      permissionStatus: "not_required" as const,
      createdAt: "2026-09-02T00:00:00.000Z",
      updatedAt: "2026-09-02T00:20:00.000Z",
      completedAt: "2026-09-02T00:20:00.000Z",
    };
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => completed }),
        set: vi.fn(),
      }),
    );
    await expect(applyKairaActivityExecutionCommandAtomic({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      activityId: "theatre_01",
      command: { type: "complete", authority: "kaira_activity_executor" },
      now: "2026-09-02T00:21:00.000Z",
    })).resolves.toEqual({ status: "replayed", record: completed });

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => completed }),
        set: vi.fn(),
      }),
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
