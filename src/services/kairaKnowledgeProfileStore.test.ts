import { beforeEach, describe, expect, it, vi } from "vitest";

const firestore = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("firebase/firestore", () => firestore);
vi.mock("../lib/firebase", () => ({ db: { kind: "mock-db" } }));

import {
  knowledgeProfileOwnerId,
  loadKairaKnowledgeProfile,
  loadKairaKnowledgeProfileResult,
  saveKairaKnowledgeProfile,
} from "./kairaKnowledgeProfileStore";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Kaira knowledge profile store", () => {
  it("owns knowledge by Kaira instance rather than conversation user", () => {
    expect(knowledgeProfileOwnerId("kaira_individual_01")).toBe("kaira_individual_01");
    expect(knowledgeProfileOwnerId(" kaira individual 01 ")).toBe("kaira_individual_01");
  });

  it("persists a validated bounded profile under the instance id", async () => {
    firestore.setDoc.mockResolvedValue(undefined);
    await saveKairaKnowledgeProfile({
      kairaInstanceId: "kaira_individual_01",
      schemaVersion: 1,
      coverage: "bounded_catalog",
      concepts: [
        {
          id: "concept_krizantem",
          label: "krizantem",
          provenance: "inherited",
          confidence: 1,
        },
      ],
    });

    expect(firestore.doc).toHaveBeenCalledWith(
      expect.anything(),
      "kairaKnowledgeProfiles",
      "kaira_individual_01",
    );
    expect(firestore.setDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: "kaira_individual_01" }),
      expect.objectContaining({
        kairaInstanceId: "kaira_individual_01",
        coverage: "bounded_catalog",
      }),
    );
  });

  it("rejects invalid profiles before Firestore mutation", async () => {
    await expect(
      saveKairaKnowledgeProfile({
        kairaInstanceId: "kaira_individual_01",
        schemaVersion: 1,
        coverage: "bounded_catalog",
        concepts: [
          {
            id: "bad",
            label: "bad",
            provenance: "inherited",
            confidence: 2,
          },
        ],
      }),
    ).rejects.toThrow("Invalid Kaira knowledge profile");
    expect(firestore.setDoc).not.toHaveBeenCalled();
  });

  it("loads only a valid profile owned by the requested instance", async () => {
    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        kairaInstanceId: "kaira_individual_01",
        schemaVersion: 1,
        coverage: "bounded_catalog",
        concepts: [],
      }),
    });
    await expect(loadKairaKnowledgeProfile("kaira_individual_01")).resolves.toMatchObject({
      kairaInstanceId: "kaira_individual_01",
      coverage: "bounded_catalog",
    });

    firestore.getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        kairaInstanceId: "another_kaira",
        schemaVersion: 1,
        coverage: "bounded_catalog",
        concepts: [],
      }),
    });
    await expect(loadKairaKnowledgeProfile("kaira_individual_01")).resolves.toBeNull();
  });
  it("distinguishes a missing profile from an unavailable profile store", async () => {
    firestore.getDoc.mockResolvedValueOnce({ exists: () => false });
    await expect(loadKairaKnowledgeProfileResult("kaira_individual_01")).resolves.toEqual({
      status: "missing",
      profile: null,
    });

    firestore.getDoc.mockRejectedValueOnce(new Error("firestore unavailable"));
    await expect(loadKairaKnowledgeProfileResult("kaira_individual_01")).resolves.toEqual({
      status: "unavailable",
      profile: null,
    });
  });

});
