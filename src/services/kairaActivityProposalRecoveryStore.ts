import { doc, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import { instancePolicy, kairaOwnerScope, resolveKairaInstanceContext, type KairaInstanceContext } from "./kairaInstanceContext";

const COLLECTION = "kairaActivityProposalRecovery";

export interface KairaActivityProposalRecoveryReceipt {
  schemaVersion: 1;
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  proposalId: string;
  status: "claimed" | "completed";
  claimedAt: string;
  leaseUntil: string;
  completedAt?: string;
  outcome?: "materialized" | "already_materialized" | "cancelled";
}

export type KairaActivityProposalRecoveryClaimResult =
  | { status: "claimed" | "reclaimed"; receipt: KairaActivityProposalRecoveryReceipt }
  | { status: "busy" | "replayed"; receipt: KairaActivityProposalRecoveryReceipt };

const owner = (value: unknown) => String(value || "").trim().replace(/[^a-zA-Z0-9_@.+:-]+/g, "_").slice(0, 160);
const key = (value: unknown) => String(value || "").trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9_:-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 160);

function identity(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  proposalId: string;
}) {
  const instance = resolveKairaInstanceContext({ instanceId: input.kairaInstanceId, instanceType: input.instanceType });
  if (!instancePolicy(instance.instanceType).autonomousActivityPlanning) throw new Error("Kaira instance cannot own proposal recovery");
  const ownerUserId = owner(input.ownerUserId);
  const proposalId = key(input.proposalId);
  if (!ownerUserId || !proposalId) throw new Error("Invalid Kaira proposal recovery identity");
  return { instance, ownerUserId, proposalId };
}

const refFor = (value: ReturnType<typeof identity>) => doc(
  db,
  COLLECTION,
  `${kairaOwnerScope(value.ownerUserId, value.instance.instanceId)}__proposal_recovery__${value.proposalId}`.slice(0, 480),
);

function sameReceipt(receipt: KairaActivityProposalRecoveryReceipt, value: ReturnType<typeof identity>) {
  return receipt.ownerUserId === value.ownerUserId
    && receipt.kairaInstanceId === value.instance.instanceId
    && receipt.instanceType === value.instance.instanceType
    && receipt.proposalId === value.proposalId;
}

export function buildReclaimedKairaActivityProposalRecoveryReceipt(input: {
  existing: KairaActivityProposalRecoveryReceipt;
  claimedAt: string;
  leaseUntil: string;
}): KairaActivityProposalRecoveryReceipt {
  const { completedAt: _completedAt, outcome: _outcome, ...activeReceipt } = input.existing;
  return {
    ...activeReceipt,
    status: "claimed",
    claimedAt: input.claimedAt,
    leaseUntil: input.leaseUntil,
  };
}

export async function claimKairaActivityProposalRecovery(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  proposalId: string;
  now: string;
  leaseMinutes?: number;
}): Promise<KairaActivityProposalRecoveryClaimResult> {
  const value = identity(input);
  const nowMs = Date.parse(input.now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira proposal recovery claim time");
  const leaseMinutes = Math.max(1, Math.min(30, input.leaseMinutes || 5));
  const ref = refFor(value);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      const existing = snapshot.data() as KairaActivityProposalRecoveryReceipt;
      if (!sameReceipt(existing, value)) throw new Error("Kaira proposal recovery idempotency conflict");
      if (existing.status === "completed") return { status: "replayed", receipt: existing } as const;
      const leaseUntilMs = Date.parse(existing.leaseUntil);
      if (Number.isFinite(leaseUntilMs) && leaseUntilMs > nowMs) return { status: "busy", receipt: existing } as const;
      const reclaimed = buildReclaimedKairaActivityProposalRecoveryReceipt({
        existing,
        claimedAt: new Date(nowMs).toISOString(),
        leaseUntil: new Date(nowMs + leaseMinutes * 60_000).toISOString(),
      });
      transaction.set(ref, reclaimed);
      return { status: "reclaimed", receipt: reclaimed } as const;
    }

    const receipt: KairaActivityProposalRecoveryReceipt = {
      schemaVersion: 1,
      ownerUserId: value.ownerUserId,
      kairaInstanceId: value.instance.instanceId,
      instanceType: value.instance.instanceType,
      proposalId: value.proposalId,
      status: "claimed",
      claimedAt: new Date(nowMs).toISOString(),
      leaseUntil: new Date(nowMs + leaseMinutes * 60_000).toISOString(),
    };
    transaction.set(ref, receipt);
    return { status: "claimed", receipt } as const;
  });
}

export async function completeKairaActivityProposalRecovery(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  proposalId: string;
  now: string;
  outcome: "materialized" | "already_materialized" | "cancelled";
}): Promise<KairaActivityProposalRecoveryReceipt> {
  const value = identity(input);
  const nowMs = Date.parse(input.now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira proposal recovery completion time");
  const ref = refFor(value);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Kaira proposal recovery claim not found");
    const existing = snapshot.data() as KairaActivityProposalRecoveryReceipt;
    if (!sameReceipt(existing, value)) throw new Error("Kaira proposal recovery idempotency conflict");
    if (existing.status === "completed") {
      if (existing.outcome !== input.outcome) throw new Error("Kaira proposal recovery outcome conflict");
      return existing;
    }
    const completed: KairaActivityProposalRecoveryReceipt = {
      ...existing,
      status: "completed",
      completedAt: new Date(nowMs).toISOString(),
      outcome: input.outcome,
    };
    transaction.set(ref, completed);
    return completed;
  });
}
