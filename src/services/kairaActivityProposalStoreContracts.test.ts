import { beforeEach, describe, expect, it, vi } from "vitest";
import { scoreKairaActivityProposal } from "./kairaActivityPlanningPolicy";
import { createKairaActivityProposalRecord } from "./kairaActivityProposalRecord";

const firestore = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
}));
vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import {
  createKairaActivityProposalAtomic,
  markKairaActivityProposalMaterializedAtomic,
} from "./kairaActivityProposalStore";

const record = (proposalId = "theatre_01") =>
  createKairaActivityProposalRecord({
    ownerUserId: "owner_1",
    kairaInstanceId: "kaira_a",
    instanceType: "individual",
    selected: scoreKairaActivityProposal({
      proposalId,
      activityType: "theatre",
      motivation: { kind: "recreation", strength: 0.9 },
      learnedPreference: { affinity: 0.7, confidence: 0.9 },
      noveltyFit: 0.7,
      contextualFit: 0.9,
      interruptionCost: 0.1,
      risk: 0.1,
      repetitionPressure: 0.1,
      availability: "available",
      permissionPolicy: "owner_approval",
      notBefore: "2026-09-02T18:00:00.000Z",
      evidenceIds: ["preference:theatre"],
    }),
    now: "2026-09-02T12:00:00.000Z",
  });

beforeEach(() => vi.clearAllMocks());

describe("Kaira activity proposal store contracts", () => {
  it("creates once and replays the same canonical proposal", async () => {
    const value = record();
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => false }), set }),
    );
    await expect(createKairaActivityProposalAtomic(value)).resolves.toEqual({ status: "created", record: value });
    expect(set).toHaveBeenCalledWith(expect.anything(), value);

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => value }), set: vi.fn() }),
    );
    await expect(createKairaActivityProposalAtomic(value)).resolves.toEqual({ status: "existing", record: value });
  });

  it("fails closed when the same proposal id carries different planning semantics", async () => {
    const value = record();
    const drifted = {
      ...value,
      selected: {
        ...value.selected,
        candidate: { ...value.selected.candidate, contextualFit: 0.1 },
      },
    };
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => drifted }), set: vi.fn() }),
    );
    await expect(createKairaActivityProposalAtomic(value)).rejects.toThrow("idempotency conflict");
  });

  it("marks materialized once and replays terminal projection", async () => {
    const value = record();
    const set = vi.fn();
    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => value }), set }),
    );
    const materialized = await markKairaActivityProposalMaterializedAtomic({
      record: value,
      now: "2026-09-02T12:01:00.000Z",
    });
    expect(materialized.status).toBe("materialized");
    expect(set).toHaveBeenCalledTimes(1);

    firestore.runTransaction.mockImplementationOnce(async (_db: unknown, callback: (tx: any) => unknown) =>
      callback({ get: vi.fn().mockResolvedValue({ exists: () => true, data: () => materialized }), set: vi.fn() }),
    );
    await expect(markKairaActivityProposalMaterializedAtomic({
      record: value,
      now: "2026-09-02T12:02:00.000Z",
    })).resolves.toBe(materialized);
  });
});
