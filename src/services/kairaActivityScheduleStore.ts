import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import { kairaOwnerScope } from "./kairaInstanceContext";
import {
  cancelKairaActivitySchedule,
  createKairaActivitySchedule,
  evaluateKairaActivitySchedule,
  markKairaActivityScheduleDispatched,
  markKairaActivityScheduleExpired,
  type KairaActivityScheduleRecord,
} from "./kairaActivitySchedule";
import type { KairaInstanceContext } from "./kairaInstanceContext";

const ACTIVITY_SCHEDULE_COLLECTION = "kairaActivitySchedules";

const canonicalKey = (value: string) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

function scheduleDocumentId(ownerUserId: string, kairaInstanceId: string, activityId: string): string {
  return `${kairaOwnerScope(ownerUserId, kairaInstanceId)}__schedule__${canonicalKey(activityId)}`.slice(0, 480);
}

function sameScheduleSeed(
  record: KairaActivityScheduleRecord,
  input: {
    ownerUserId: string;
    kairaInstanceId: string;
    instanceType: KairaInstanceContext["instanceType"];
    activityId: string;
    notBefore: string;
    expiresAt?: string;
  },
): boolean {
  const expected = createKairaActivitySchedule({
    ...input,
    now: record.createdAt,
  });
  return (
    record.ownerUserId === expected.ownerUserId &&
    record.kairaInstanceId === expected.kairaInstanceId &&
    record.instanceType === expected.instanceType &&
    record.activityId === expected.activityId &&
    record.notBefore === expected.notBefore &&
    record.expiresAt === expected.expiresAt
  );
}

export type KairaActivityScheduleCreateResult =
  | { status: "created"; record: KairaActivityScheduleRecord }
  | { status: "existing"; record: KairaActivityScheduleRecord };

export async function createKairaActivityScheduleAtomic(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  activityId: string;
  notBefore: string;
  expiresAt?: string;
  now: string;
}): Promise<KairaActivityScheduleCreateResult> {
  const seed = createKairaActivitySchedule(input);
  const ref = doc(
    db,
    ACTIVITY_SCHEDULE_COLLECTION,
    scheduleDocumentId(seed.ownerUserId, seed.kairaInstanceId, seed.activityId),
  );
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      const existing = snapshot.data() as KairaActivityScheduleRecord;
      if (!sameScheduleSeed(existing, input)) {
        throw new Error("Kaira activity schedule idempotency conflict");
      }
      return { status: "existing", record: existing } as const;
    }
    transaction.set(ref, seed);
    return { status: "created", record: seed } as const;
  });
}

export async function loadKairaActivitySchedule(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  activityId: string;
}): Promise<KairaActivityScheduleRecord | null> {
  const snapshot = await getDoc(doc(
    db,
    ACTIVITY_SCHEDULE_COLLECTION,
    scheduleDocumentId(input.ownerUserId, input.kairaInstanceId, input.activityId),
  ));
  if (!snapshot.exists()) return null;
  return snapshot.data() as KairaActivityScheduleRecord;
}

export type KairaActivityScheduleDispatchCommitResult =
  | { status: "dispatched" | "replayed"; record: KairaActivityScheduleRecord }
  | { status: "not_due" | "cancelled" | "expired"; record: KairaActivityScheduleRecord };

export async function commitKairaActivityScheduleDispatchAtomic(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  activityId: string;
  now: string;
}): Promise<KairaActivityScheduleDispatchCommitResult> {
  const ref = doc(
    db,
    ACTIVITY_SCHEDULE_COLLECTION,
    scheduleDocumentId(input.ownerUserId, input.kairaInstanceId, input.activityId),
  );
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Kaira activity schedule not found");
    const record = snapshot.data() as KairaActivityScheduleRecord;
    const evaluation = evaluateKairaActivitySchedule(record, input.now);
    if (evaluation.status === "already_dispatched") {
      return { status: "replayed", record } as const;
    }
    if (evaluation.status === "expired") {
      const expired = record.status === "expired"
        ? record
        : markKairaActivityScheduleExpired(record, input.now);
      if (expired !== record) transaction.set(ref, expired);
      return { status: "expired", record: expired } as const;
    }
    if (evaluation.status === "cancelled") return { status: "cancelled", record } as const;
    if (evaluation.status === "not_due") return { status: "not_due", record } as const;

    const dispatched = markKairaActivityScheduleDispatched(record, input.now);
    transaction.set(ref, dispatched);
    return { status: "dispatched", record: dispatched } as const;
  });
}

export async function cancelKairaActivityScheduleAtomic(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  activityId: string;
  now: string;
}): Promise<KairaActivityScheduleRecord> {
  const ref = doc(
    db,
    ACTIVITY_SCHEDULE_COLLECTION,
    scheduleDocumentId(input.ownerUserId, input.kairaInstanceId, input.activityId),
  );
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Kaira activity schedule not found");
    const record = snapshot.data() as KairaActivityScheduleRecord;
    const cancelled = cancelKairaActivitySchedule(record, input.now);
    if (cancelled !== record) transaction.set(ref, cancelled);
    return cancelled;
  });
}
