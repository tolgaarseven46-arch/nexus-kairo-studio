import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import {
  loadKairaActivityDynamicState,
  projectKairaActivityDynamicState,
  saveKairaActivityDynamicStateAtomic,
} from "./kairaActivityDynamicStateStore";

const state = (anger = 20) => ({
  calmness: 70,
  anger,
  stress: 25,
  happiness: 65,
  confidence: 72,
  surprise: 12,
  lastStatus: "  sakin ama meraklı  ",
  reactionMode: "hurt" as const,
  lastEvent: {
    eventTitle: "Ali ile tartışma",
    reactionText: "kırıldım",
    deltas: [],
  },
  relationship: {
    firstSeenAt: "2026-08-01T00:00:00.000Z",
    warmth: 10,
    trust: 15,
  },
});

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity dynamic state store contracts", () => {
  it("projects only global affect axes and strips dyadic relationship metadata", () => {
    expect(projectKairaActivityDynamicState(state())).toEqual({
      calmness: 70,
      anger: 20,
      stress: 25,
      happiness: 65,
      confidence: 72,
      surprise: 12,
      lastStatus: "sakin ama meraklı",
    });
  });

  it("rejects invalid percent axes before persistence", () => {
    expect(() => projectKairaActivityDynamicState({ ...state(), stress: 140 })).toThrow("stress");
  });

  it("saves a monotonic instance-owned snapshot and replays exact timestamp retries", async () => {
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => false }), set }),
    );
    const input = {
      kairaInstanceId: "Kaira A",
      instanceType: "individual" as const,
      state: state(),
      observedAt: "2026-09-02T02:10:00Z",
      sourceId: "chat:turn_10",
    };
    const saved = await saveKairaActivityDynamicStateAtomic(input);
    expect(saved.status).toBe("saved");
    expect(saved.snapshot).toMatchObject({
      kairaInstanceId: "Kaira_A",
      instanceType: "individual",
      observedAt: "2026-09-02T02:10:00.000Z",
      sourceId: "chat:turn_10",
      state: { anger: 20 },
    });
    expect(saved.snapshot.state.relationship).toBeUndefined();
    expect(set).toHaveBeenCalledOnce();

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => saved.snapshot }), set: vi.fn() }),
    );
    await expect(saveKairaActivityDynamicStateAtomic(input)).resolves.toEqual({
      status: "replayed",
      snapshot: saved.snapshot,
    });
  });

  it("keeps newer state when an older observation arrives and rejects same-time semantic conflict", async () => {
    const current = {
      schemaVersion: 1 as const,
      kairaInstanceId: "Kaira_A",
      instanceType: "individual" as const,
      state: projectKairaActivityDynamicState(state()),
      observedAt: "2026-09-02T02:10:00.000Z",
      sourceId: "chat:turn_10",
    };
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => current }), set: vi.fn() }),
    );
    await expect(saveKairaActivityDynamicStateAtomic({
      kairaInstanceId: "Kaira A",
      instanceType: "individual",
      state: state(50),
      observedAt: "2026-09-02T02:09:00Z",
      sourceId: "chat:turn_9",
    })).resolves.toEqual({ status: "stale", snapshot: current });

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => current }), set: vi.fn() }),
    );
    await expect(saveKairaActivityDynamicStateAtomic({
      kairaInstanceId: "Kaira A",
      instanceType: "individual",
      state: state(50),
      observedAt: "2026-09-02T02:10:00Z",
      sourceId: "chat:turn_10",
    })).rejects.toThrow("timestamp conflict");
  });

  it("loads the persisted snapshot but refuses welcome-owned autonomous state", async () => {
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        schemaVersion: 1,
        kairaInstanceId: "kaira_a",
        instanceType: "individual",
        state: state(),
        observedAt: "2026-09-02T02:10:00Z",
        sourceId: "chat:turn_10",
      }),
    });
    const loaded = await loadKairaActivityDynamicState({ kairaInstanceId: "kaira_a" });
    expect(loaded?.state.relationship).toBeUndefined();

    await expect(saveKairaActivityDynamicStateAtomic({
      kairaInstanceId: "welcome_a",
      instanceType: "welcome",
      state: state(),
      observedAt: "2026-09-02T02:10:00Z",
      sourceId: "chat:turn_10",
    })).rejects.toThrow("cannot own autonomous dynamic state");
  });
});
