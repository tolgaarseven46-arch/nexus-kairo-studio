import { beforeEach, describe, expect, it, vi } from "vitest";
import { createKairaActivityExecution } from "./kairaActivityExecution";
import { createKairaActivityPermissionDialogueRequest } from "./kairaActivityPermissionDialogue";
import { createKairaActivityPermissionSessionPointer } from "./kairaActivityPermissionSessionPointer";

const firestore = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import {
  clearKairaActivityPermissionSessionPointerAtomic,
  createKairaActivityPermissionSessionPointerAtomic,
  loadActiveKairaActivityPermissionSessionPointer,
} from "./kairaActivityPermissionSessionPointerStore";

const request = (activityId = "theatre_01", promptTurnId = "turn_42") =>
  createKairaActivityPermissionDialogueRequest({
    execution: createKairaActivityExecution({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      activityId,
      activityType: "theatre",
      permissionPolicy: "owner_approval",
      now: "2026-09-02T10:00:00.000Z",
    }),
    sessionId: "session_1",
    promptTurnId,
    now: "2026-09-02T10:01:00.000Z",
  });

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity permission session pointer store contracts", () => {
  it("creates one active pointer and replays the same request", async () => {
    const pending = request();
    const pointer = createKairaActivityPermissionSessionPointer(pending);
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => false }), set }),
    );
    await expect(createKairaActivityPermissionSessionPointerAtomic(pending)).resolves.toEqual({
      status: "created",
      pointer,
    });
    expect(set).toHaveBeenCalledWith(expect.anything(), pointer);

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => pointer }),
        set: vi.fn(),
      }),
    );
    await expect(createKairaActivityPermissionSessionPointerAtomic(pending)).resolves.toEqual({
      status: "existing",
      pointer,
    });
  });

  it("fails closed when another pending activity tries to occupy the same session", async () => {
    const existing = createKairaActivityPermissionSessionPointer(request());
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => existing }),
        set: vi.fn(),
      }),
    );
    await expect(
      createKairaActivityPermissionSessionPointerAtomic(request("concert_02", "turn_99")),
    ).rejects.toThrow("already exists for session");
  });

  it("loads only an active pointer", async () => {
    const active = createKairaActivityPermissionSessionPointer(request());
    firestore.getDoc.mockResolvedValueOnce({ exists: () => true, data: () => active });
    await expect(
      loadActiveKairaActivityPermissionSessionPointer({
        ownerUserId: "owner_1",
        kairaInstanceId: "kaira_a",
        sessionId: "session_1",
      }),
    ).resolves.toEqual(active);

    firestore.getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ...active, status: "cleared" }),
    });
    await expect(
      loadActiveKairaActivityPermissionSessionPointer({
        ownerUserId: "owner_1",
        kairaInstanceId: "kaira_a",
        sessionId: "session_1",
      }),
    ).resolves.toBeNull();
  });

  it("clears the matching pointer and refuses correlation drift", async () => {
    const active = createKairaActivityPermissionSessionPointer(request());
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => active }),
        set,
      }),
    );
    const cleared = await clearKairaActivityPermissionSessionPointerAtomic({
      pointer: active,
      now: "2026-09-02T10:02:00.000Z",
    });
    expect(cleared.status).toBe("cleared");
    expect(set).toHaveBeenCalledTimes(1);

    const drifted = createKairaActivityPermissionSessionPointer(request("concert_02", "turn_99"));
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => active }),
        set: vi.fn(),
      }),
    );
    await expect(
      clearKairaActivityPermissionSessionPointerAtomic({
        pointer: drifted,
        now: "2026-09-02T10:03:00.000Z",
      }),
    ).rejects.toThrow("correlation mismatch");
  });
});
