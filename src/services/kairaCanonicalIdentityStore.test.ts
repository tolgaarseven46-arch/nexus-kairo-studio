import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  transactionGet: vi.fn(),
  transactionSet: vi.fn(),
  runTransaction: vi.fn(async (_db: unknown, callback: (transaction: { get: typeof firestore.transactionGet; set: typeof firestore.transactionSet }) => unknown) =>
    callback({ get: firestore.transactionGet, set: firestore.transactionSet })),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import { canonicalIdentityFromSeed } from "./kairaCanonicalIdentity";
import { buildKairaIdentityTestFixture, type KairaAutobiographicalMemory } from "./kairaIdentityContracts";
import {
  appendKairaAutobiographicalMemoryAtomic,
  loadKairaCanonicalIdentity,
  loadKairaCanonicalIdentityResult,
  saveKairaCanonicalIdentity,
} from "./kairaCanonicalIdentityStore";

beforeEach(() => {
  vi.clearAllMocks();
});

const livedMemory = (id = "lived_obs_1"): KairaAutobiographicalMemory => ({
  id,
  origin: "lived",
  occurredAt: "2026-09-01T10:00:00.000Z",
  participantIds: ["user_1"],
  eventType: "insult",
  facts: ["salak", "actor:user_1"],
  emotions: [{ label: "kırgınlık", intensity: 0.7 }],
  salience: 0.8,
  sensitivity: "ordinary",
  canonical: true,
  sourceWorldObservationIds: ["obs_1"],
  consolidationKey: "world:obs_1",
});

describe("Kaira canonical identity store", () => {
  it("persists self-facts and autobiography under the Kaira instance, not the user", async () => {
    firestore.setDoc.mockResolvedValue(undefined);
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_individual_01"));

    await saveKairaCanonicalIdentity(
      { instanceId: "kaira_individual_01", instanceType: "individual" },
      state,
    );

    expect(firestore.doc).toHaveBeenCalledWith(
      expect.anything(),
      "kairaCanonicalIdentities",
      "kaira_individual_01",
    );
    expect(firestore.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: "kaira_individual_01" }),
      expect.objectContaining({
        kairaInstanceId: "kaira_individual_01",
        selfFacts: expect.any(Array),
        autobiographicalMemories: expect.any(Array),
      }),
    );
  });

  it("never persists canonical life for Welcome Kaira", async () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("welcome_demo"));
    await expect(
      saveKairaCanonicalIdentity(
        { instanceId: "welcome_demo", instanceType: "welcome" },
        state,
      ),
    ).rejects.toThrow("cannot persist canonical identity");
    expect(firestore.setDoc).not.toHaveBeenCalled();
    await expect(
      loadKairaCanonicalIdentityResult({ instanceId: "welcome_demo", instanceType: "welcome" }),
    ).resolves.toEqual({ status: "ephemeral", state: null });
    await expect(
      appendKairaAutobiographicalMemoryAtomic(
        { instanceId: "welcome_demo", instanceType: "welcome" },
        livedMemory(),
      ),
    ).resolves.toEqual({ status: "ephemeral", memoryId: null });
    expect(firestore.runTransaction).not.toHaveBeenCalled();
  });

  it("rejects cross-instance ownership before Firestore mutation", async () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    await expect(
      saveKairaCanonicalIdentity(
        { instanceId: "kaira_b", instanceType: "individual" },
        state,
      ),
    ).rejects.toThrow("owner mismatch");
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  it("loads only valid state owned by the requested instance", async () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    firestore.getDoc.mockResolvedValue({ exists: () => true, data: () => state });
    await expect(
      loadKairaCanonicalIdentity({ instanceId: "kaira_a", instanceType: "individual" }),
    ).resolves.toMatchObject({ kairaInstanceId: "kaira_a" });

    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ ...state, kairaInstanceId: "kaira_b" }),
    });
    await expect(
      loadKairaCanonicalIdentity({ instanceId: "kaira_a", instanceType: "individual" }),
    ).resolves.toBeNull();
  });

  it("fails closed on prose-shaped canonical memories", async () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    const invalid = {
      ...state,
      autobiographicalMemories: [
        { ...state.autobiographicalMemories[0], narrationText: "Hazır hikâye metni" },
      ],
    };
    await expect(
      saveKairaCanonicalIdentity(
        { instanceId: "kaira_a", instanceType: "individual" },
        invalid as never,
      ),
    ).rejects.toThrow("memory_truth_not_prose");
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  it("atomically appends a lived memory without replacing existing autobiography", async () => {
    const current = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    firestore.transactionGet.mockResolvedValue({ exists: () => true, data: () => current });

    await expect(
      appendKairaAutobiographicalMemoryAtomic(
        { instanceId: "kaira_a", instanceType: "individual" },
        livedMemory(),
      ),
    ).resolves.toEqual({ status: "appended", memoryId: "lived_obs_1" });

    expect(firestore.transactionSet).toHaveBeenCalledTimes(1);
    expect(firestore.transactionSet.mock.calls[0][1].autobiographicalMemories).toHaveLength(2);
  });

  it("treats a retried source observation as an idempotent duplicate", async () => {
    const current = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    current.autobiographicalMemories.push(livedMemory());
    firestore.transactionGet.mockResolvedValue({ exists: () => true, data: () => current });

    await expect(
      appendKairaAutobiographicalMemoryAtomic(
        { instanceId: "kaira_a", instanceType: "individual" },
        livedMemory("different_id_same_source"),
      ),
    ).resolves.toEqual({ status: "duplicate", memoryId: "lived_obs_1" });
    expect(firestore.transactionSet).not.toHaveBeenCalled();
  });

  it("fails closed when provisioning has not created canonical identity", async () => {
    firestore.transactionGet.mockResolvedValue({ exists: () => false });
    await expect(
      appendKairaAutobiographicalMemoryAtomic(
        { instanceId: "kaira_a", instanceType: "individual" },
        livedMemory(),
      ),
    ).resolves.toEqual({ status: "missing_identity", memoryId: null });
    expect(firestore.transactionSet).not.toHaveBeenCalled();
  });
});
