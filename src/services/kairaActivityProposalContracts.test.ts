import { describe, expect, it } from "vitest";
import { scoreKairaActivityProposal } from "./kairaActivityPlanningPolicy";
import {
  cancelKairaActivityProposal,
  createKairaActivityProposalRecord,
  markKairaActivityProposalMaterialized,
} from "./kairaActivityProposalRecord";

const selected = () => scoreKairaActivityProposal({
  proposalId: "theatre_01",
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
});

describe("Kaira activity proposal record contracts", () => {
  it("persists the selected score and evidence as canonical proposal provenance", () => {
    const record = createKairaActivityProposalRecord({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      selected: selected(),
      now: "2026-09-02T12:00:00.000Z",
    });
    expect(record).toMatchObject({
      status: "selected",
      proposalId: "theatre_01",
      selected: {
        candidate: { evidenceIds: ["preference:theatre"] },
      },
    });
  });

  it("materializes once and cannot cancel through proposal authority afterwards", () => {
    const record = createKairaActivityProposalRecord({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      selected: selected(),
      now: "2026-09-02T12:00:00.000Z",
    });
    const materialized = markKairaActivityProposalMaterialized(record, "2026-09-02T12:01:00.000Z");
    expect(materialized.status).toBe("materialized");
    expect(markKairaActivityProposalMaterialized(materialized, "2026-09-02T12:02:00.000Z")).toBe(materialized);
    expect(() => cancelKairaActivityProposal(materialized, "2026-09-02T12:03:00.000Z"))
      .toThrow("execution authority");
  });

  it("allows cancellation only before materialization", () => {
    const record = createKairaActivityProposalRecord({
      ownerUserId: "owner_1",
      kairaInstanceId: "kaira_a",
      instanceType: "individual",
      selected: selected(),
      now: "2026-09-02T12:00:00.000Z",
    });
    const cancelled = cancelKairaActivityProposal(record, "2026-09-02T12:01:00.000Z", "context_changed");
    expect(cancelled).toMatchObject({ status: "cancelled", cancellationReason: "context_changed" });
    expect(() => markKairaActivityProposalMaterialized(cancelled, "2026-09-02T12:02:00.000Z"))
      .toThrow("cannot materialize");
  });
});
