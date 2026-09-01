import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import { canonicalIdentityFromSeed } from "./kairaCanonicalIdentity";
import { buildKairaIdentityTestFixture } from "./kairaIdentityContracts";
import {
  loadKairaCanonicalIdentity,
  loadKairaCanonicalIdentityResult,
  saveKairaCanonicalIdentity,
} from "./kairaCanonicalIdentityStore";

beforeEach(() => {
  vi.clearAllMocks();
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
});
