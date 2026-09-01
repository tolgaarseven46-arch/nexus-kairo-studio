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
import { applyKairaSelfFactRevisionAtomic } from "./kairaCanonicalIdentityStore";

const memory = (id: string): KairaAutobiographicalMemory => ({
  id,
  origin: "lived",
  occurredAt: "2026-09-01T10:00:00.000Z",
  participantIds: ["user_1"],
  eventType: "general",
  facts: ["typed evidence only"],
  emotions: [],
  salience: 0.8,
  sensitivity: "ordinary",
  canonical: true,
  sourceWorldObservationIds: [`obs_${id}`],
  consolidationKey: `world:obs_${id}`,
  selfRevisionEvidence: {
    factKey: "preferred_music",
    domain: "preference",
    value: "ambient",
    confidence: 0.9,
  },
});

beforeEach(() => vi.clearAllMocks());

describe("Kaira atomic self-fact revision store", () => {
  it("recomputes canonical evidence inside the transaction and applies the revision", async () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    state.autobiographicalMemories.push(memory("m1"), memory("m2"), memory("m3"));
    firestore.transactionGet.mockResolvedValue({ exists: () => true, data: () => state });

    const result = await applyKairaSelfFactRevisionAtomic(
      { instanceId: "kaira_a", instanceType: "individual" },
      "preferred_music",
    );

    expect(result.status).toBe("applied");
    expect(firestore.transactionSet).toHaveBeenCalledTimes(1);
    expect(firestore.transactionSet.mock.calls[0][1].selfFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "preferred_music", value: "ambient", source: "lived_revision" }),
      ]),
    );
  });

  it("does not write when evidence is below the multi-episode threshold", async () => {
    const state = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    state.autobiographicalMemories.push(memory("m1"));
    firestore.transactionGet.mockResolvedValue({ exists: () => true, data: () => state });

    const result = await applyKairaSelfFactRevisionAtomic(
      { instanceId: "kaira_a", instanceType: "individual" },
      "preferred_music",
    );

    expect(result.status).toBe("unchanged");
    expect(result.decision?.status).toBe("insufficient_evidence");
    expect(firestore.transactionSet).not.toHaveBeenCalled();
  });

  it("never mutates Welcome Kaira identity", async () => {
    await expect(
      applyKairaSelfFactRevisionAtomic(
        { instanceId: "welcome", instanceType: "welcome" },
        "preferred_music",
      ),
    ).resolves.toEqual({ status: "ephemeral", decision: null });
    expect(firestore.runTransaction).not.toHaveBeenCalled();
  });
});
