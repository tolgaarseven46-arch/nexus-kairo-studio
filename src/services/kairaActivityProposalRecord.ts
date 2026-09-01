import type { KairaInstanceContext } from "./kairaInstanceContext";
import type { KairaActivityProposalScore } from "./kairaActivityPlanningPolicy";

export interface KairaActivityProposalRecord {
  schemaVersion: 1;
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  proposalId: string;
  status: "selected" | "materialized" | "cancelled";
  selected: KairaActivityProposalScore;
  createdAt: string;
  updatedAt: string;
  materializedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

const canonicalOwner = (value: string) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_@.+:-]+/g, "_")
    .slice(0, 160);

export function createKairaActivityProposalRecord(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  selected: KairaActivityProposalScore;
  now: string;
}): KairaActivityProposalRecord {
  const ownerUserId = canonicalOwner(input.ownerUserId);
  const nowMs = Date.parse(input.now);
  if (!ownerUserId || !input.selected.proposalId || !Number.isFinite(nowMs)) {
    throw new Error("Invalid Kaira activity proposal record");
  }
  return {
    schemaVersion: 1,
    ownerUserId,
    kairaInstanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
    proposalId: input.selected.proposalId,
    status: "selected",
    selected: {
      ...input.selected,
      candidate: {
        ...input.selected.candidate,
        evidenceIds: [...input.selected.candidate.evidenceIds],
        ...(input.selected.candidate.experienceSubject
          ? { experienceSubject: { ...input.selected.candidate.experienceSubject } }
          : {}),
      },
      components: { ...input.selected.components },
    },
    createdAt: new Date(nowMs).toISOString(),
    updatedAt: new Date(nowMs).toISOString(),
  };
}

export function markKairaActivityProposalMaterialized(
  record: KairaActivityProposalRecord,
  now: string,
): KairaActivityProposalRecord {
  if (record.status === "materialized") return record;
  if (record.status !== "selected") throw new Error("Cancelled Kaira activity proposal cannot materialize");
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira activity proposal materialization time");
  const materializedAt = new Date(nowMs).toISOString();
  return {
    ...record,
    status: "materialized",
    updatedAt: materializedAt,
    materializedAt,
  };
}

export function cancelKairaActivityProposal(
  record: KairaActivityProposalRecord,
  now: string,
  reason?: string,
): KairaActivityProposalRecord {
  if (record.status === "cancelled") return record;
  if (record.status === "materialized") {
    throw new Error("Materialized Kaira activity proposal must be cancelled through execution authority");
  }
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira activity proposal cancellation time");
  const cancelledAt = new Date(nowMs).toISOString();
  return {
    ...record,
    status: "cancelled",
    updatedAt: cancelledAt,
    cancelledAt,
    cancellationReason: String(reason || "cancelled").trim().slice(0, 160),
  };
}
