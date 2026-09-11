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
  applyKairaSelfFactRevisionAtomic,
  loadKairaCanonicalIdentityResult,
} from "./kairaCanonicalIdentityStore";
import { resolveKairaAutobiographicalRecallRuntime } from "./kairaAutobiographicalRecallRuntime";
import { resolveKairaInstanceContext } from "./kairaInstanceContext";

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

describe("self-fact correction persistence -> hydration -> retrieval", () => {
  it("retrieves the revised canonical value after the transaction write is hydrated back", async () => {
    const instance = resolveKairaInstanceContext({ instanceId: "kaira_a", instanceType: "individual" });
    const initial = canonicalIdentityFromSeed(buildKairaIdentityTestFixture("kaira_a"));
    initial.autobiographicalMemories.push(memory("m1"), memory("m2"), memory("m3"));
    firestore.transactionGet.mockResolvedValue({ exists: () => true, data: () => initial });

    const applied = await applyKairaSelfFactRevisionAtomic(instance, "preferred_music");
    expect(applied.status).toBe("applied");
    expect(firestore.transactionSet).toHaveBeenCalledTimes(1);

    const persisted = firestore.transactionSet.mock.calls[0][1];
    expect(persisted.selfFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "preferred_music",
          value: "ambient",
          source: "lived_revision",
        }),
      ]),
    );

    firestore.getDoc.mockResolvedValue({ exists: () => true, data: () => persisted });
    const hydrated = await loadKairaCanonicalIdentityResult(instance);
    expect(hydrated.status).toBe("loaded");
    if (hydrated.status !== "loaded") throw new Error("expected loaded canonical identity");
    expect(hydrated.state.selfFacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "preferred_music", value: "ambient" }),
      ]),
    );

    const recall = await resolveKairaAutobiographicalRecallRuntime(
      {
        instance,
        query: {
          surface: "sen hangi müziği tercih edersin",
          scope: "self_fact",
          factKey: "preferred_music",
          confidence: 0.95,
        },
      },
      { loadIdentity: loadKairaCanonicalIdentityResult },
    );

    expect(recall.status).toBe("resolved");
    expect(recall.recall?.selfFacts[0]?.fact).toEqual(
      expect.objectContaining({
        key: "preferred_music",
        value: "ambient",
        source: "lived_revision",
      }),
    );
  });
});
