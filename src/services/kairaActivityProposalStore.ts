import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import { kairaOwnerScope } from "./kairaInstanceContext";
import {
  markKairaActivityProposalMaterialized,
  type KairaActivityProposalRecord,
} from "./kairaActivityProposalRecord";

const COLLECTION = "kairaActivityProposals";

function proposalDocumentId(record: Pick<KairaActivityProposalRecord, "ownerUserId" | "kairaInstanceId" | "proposalId">) {
  return `${kairaOwnerScope(record.ownerUserId, record.kairaInstanceId)}__proposal__${record.proposalId}`.slice(0, 480);
}

const stableCandidate = (record: KairaActivityProposalRecord) => JSON.stringify({
  instanceType: record.instanceType,
  proposalId: record.proposalId,
  selected: record.selected,
});

export type KairaActivityProposalCreateResult =
  | { status: "created"; record: KairaActivityProposalRecord }
  | { status: "existing"; record: KairaActivityProposalRecord };

export async function createKairaActivityProposalAtomic(
  record: KairaActivityProposalRecord,
): Promise<KairaActivityProposalCreateResult> {
  const ref = doc(db, COLLECTION, proposalDocumentId(record));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      const existing = snapshot.data() as KairaActivityProposalRecord;
      if (stableCandidate(existing) !== stableCandidate(record)) {
        throw new Error("Kaira activity proposal idempotency conflict");
      }
      return { status: "existing", record: existing } as const;
    }
    transaction.set(ref, record);
    return { status: "created", record } as const;
  });
}

export async function loadKairaActivityProposal(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  proposalId: string;
}): Promise<KairaActivityProposalRecord | null> {
  const ref = doc(db, COLLECTION, proposalDocumentId(input));
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  return snapshot.data() as KairaActivityProposalRecord;
}

export async function markKairaActivityProposalMaterializedAtomic(input: {
  record: KairaActivityProposalRecord;
  now: string;
}): Promise<KairaActivityProposalRecord> {
  const ref = doc(db, COLLECTION, proposalDocumentId(input.record));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Kaira activity proposal not found");
    const stored = snapshot.data() as KairaActivityProposalRecord;
    if (stableCandidate(stored) !== stableCandidate(input.record)) {
      throw new Error("Kaira activity proposal correlation mismatch");
    }
    if (stored.status === "materialized") return stored;
    const materialized = markKairaActivityProposalMaterialized(stored, input.now);
    transaction.set(ref, materialized);
    return materialized;
  });
}
