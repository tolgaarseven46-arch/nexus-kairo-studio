import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  runTransaction: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import { loadKairaCanonicalIdentityResult } from "./kairaCanonicalIdentityStore";
import { resolveKairaInstanceContext } from "./kairaInstanceContext";

beforeEach(() => vi.clearAllMocks());

describe("canonical identity persistence corruption recovery", () => {
  const instance = resolveKairaInstanceContext({
    instanceId: "kaira_persistence_adversarial",
    instanceType: "individual",
  });

  it("fails closed instead of silently accepting a future schema version", async () => {
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        kairaInstanceId: instance.instanceId,
        schemaVersion: 2,
        selfFacts: [],
        autobiographicalMemories: [],
      }),
    });

    await expect(loadKairaCanonicalIdentityResult(instance)).resolves.toEqual({
      status: "missing",
      state: null,
    });
  });

  it("fails closed on a partially written canonical identity document", async () => {
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        kairaInstanceId: instance.instanceId,
        schemaVersion: 1,
        selfFacts: [],
        // interrupted write: autobiographicalMemories never landed
      }),
    });

    await expect(loadKairaCanonicalIdentityResult(instance)).resolves.toEqual({
      status: "missing",
      state: null,
    });
  });

  it("distinguishes storage unavailability from corrupt persisted data", async () => {
    firestore.getDoc.mockRejectedValue(new Error("transport interrupted"));

    await expect(loadKairaCanonicalIdentityResult(instance)).resolves.toEqual({
      status: "unavailable",
      state: null,
    });
  });
});
