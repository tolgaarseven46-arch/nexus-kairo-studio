import { beforeEach, describe, expect, it, vi } from "vitest";
import { createKairaActivityExecution } from "./kairaActivityExecution";
import { createKairaActivityPermissionDialogueRequest } from "./kairaActivityPermissionDialogue";

const firestore = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  runTransaction: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import {
  createKairaActivityPermissionRequestAtomic,
  settleKairaActivityPermissionRequestAtomic,
} from "./kairaActivityPermissionDialogueStore";

const request = () =>
  createKairaActivityPermissionDialogueRequest({
    execution: createKairaActivityExecution({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      activityId: "theatre_01",
      activityType: "theatre",
      permissionPolicy: "owner_approval",
      now: "2026-09-02T10:00:00.000Z",
    }),
    sessionId: "session_1",
    promptTurnId: "assistant_42",
    now: "2026-09-02T10:01:00.000Z",
  });

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity permission dialogue store contracts", () => {
  it("creates a permission request exactly once and replays identical creation", async () => {
    const pending = request();
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => false }), set }),
    );
    await expect(createKairaActivityPermissionRequestAtomic(pending)).resolves.toEqual({
      status: "created",
      request: pending,
    });
    expect(set).toHaveBeenCalledWith(expect.anything(), pending);

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => pending }),
        set: vi.fn(),
      }),
    );
    await expect(createKairaActivityPermissionRequestAtomic(pending)).resolves.toEqual({
      status: "existing",
      request: pending,
    });
  });

  it("fails closed if the same request id points at different correlation semantics", async () => {
    const pending = request();
    const conflicting = { ...pending, promptTurnId: "assistant_99" };
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => conflicting }),
        set: vi.fn(),
      }),
    );
    await expect(createKairaActivityPermissionRequestAtomic(pending)).rejects.toThrow(
      "idempotency conflict",
    );
  });

  it("settles pending request once and replays the same terminal intent", async () => {
    const pending = request();
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => pending }),
        set,
      }),
    );
    const granted = await settleKairaActivityPermissionRequestAtomic({
      request: pending,
      intent: "grant",
      now: "2026-09-02T10:02:00.000Z",
    });
    expect(granted.status).toBe("granted");
    expect(set).toHaveBeenCalledTimes(1);

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => granted }),
        set: vi.fn(),
      }),
    );
    await expect(
      settleKairaActivityPermissionRequestAtomic({
        request: pending,
        intent: "grant",
        now: "2026-09-02T10:03:00.000Z",
      }),
    ).resolves.toBe(granted);
  });

  it("does not allow the opposite terminal decision after settlement", async () => {
    const pending = request();
    const denied = { ...pending, status: "denied" as const, resolvedAt: "2026-09-02T10:02:00.000Z" };
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => denied }),
        set: vi.fn(),
      }),
    );
    await expect(
      settleKairaActivityPermissionRequestAtomic({
        request: pending,
        intent: "grant",
        now: "2026-09-02T10:03:00.000Z",
      }),
    ).rejects.toThrow("already terminal");
  });
});
