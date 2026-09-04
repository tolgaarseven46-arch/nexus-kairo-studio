import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  where,
} from "firebase/firestore";
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

function canonicalJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalJsonValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right, "en-US"))
        .map(([key, nested]) => [key, canonicalJsonValue(nested)]),
    );
  }
  return value;
}

const stableCandidate = (record: KairaActivityProposalRecord) => JSON.stringify(canonicalJsonValue({
  instanceType: record.instanceType,
  proposalId: record.proposalId,
  selected: record.selected,
}));

export function sameKairaActivityProposalCorrelation(
  left: KairaActivityProposalRecord,
  right: KairaActivityProposalRecord,
): boolean {
  return stableCandidate(left) === stableCandidate(right);
}

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
      if (!sameKairaActivityProposalCorrelation(existing, record)) {
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

/**
 * Query-backed recovery projection. Firestore indexes the canonical proposal
 * status field, so workers inspect only selected work instead of scanning every
 * proposal document. This remains a read model; proposal status is the authority.
 */
export async function listSelectedKairaActivityProposals(input?: {
  batchSize?: number;
}): Promise<KairaActivityProposalRecord[]> {
  const batchSize = Math.max(1, Math.min(100, Math.floor(input?.batchSize || 25)));
  const selectedQuery = query(
    collection(db, COLLECTION),
    where("status", "==", "selected"),
    limit(batchSize),
  );
  const snapshot = await getDocs(selectedQuery);
  return snapshot.docs
    .map((entry) => entry.data() as KairaActivityProposalRecord)
    .filter((record) => record?.schemaVersion === 1 && record.status === "selected");
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
    if (!sameKairaActivityProposalCorrelation(stored, input.record)) {
      throw new Error("Kaira activity proposal correlation mismatch");
    }
    if (stored.status === "materialized") return stored;
    const materialized = markKairaActivityProposalMaterialized(stored, input.now);
    transaction.set(ref, materialized);
    return materialized;
  });
}
