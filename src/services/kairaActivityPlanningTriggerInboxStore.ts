import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  where,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";
import {
  normalizeKairaActivityPlanningTrigger,
  type KairaActivityPlanningTrigger,
} from "./kairaActivityPlanningTrigger";

const COLLECTION = "kairaActivityPlanningTriggerInbox";
const DEFAULT_BATCH_SIZE = 25;
const MAX_BATCH_SIZE = 100;

export interface KairaActivityPlanningTriggerInboxRecord {
  schemaVersion: 1;
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  trigger: KairaActivityPlanningTrigger;
  status: "pending" | "consumed";
  enqueuedAt: string;
  consumedAt?: string;
}

const ownerKey = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_@.+:-]+/g, "_")
    .slice(0, 160);

const docKey = (value: unknown) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);

function canonicalTime(value: string, label: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid Kaira planning trigger inbox ${label}`);
  return new Date(parsed).toISOString();
}

function documentId(kairaInstanceId: string, triggerId: string): string {
  const instance = docKey(kairaInstanceId);
  const trigger = docKey(triggerId);
  if (!instance || !trigger) throw new Error("Invalid Kaira planning trigger inbox identity");
  return `${instance}__${trigger}`.slice(0, 480);
}

function boundedBatchSize(value?: number): number {
  if (value === undefined) return DEFAULT_BATCH_SIZE;
  if (!Number.isFinite(value)) throw new Error("Invalid Kaira planning trigger inbox batch size");
  return Math.max(1, Math.min(MAX_BATCH_SIZE, Math.trunc(value)));
}

function normalizeRecord(value: unknown): KairaActivityPlanningTriggerInboxRecord {
  if (!value || typeof value !== "object") throw new Error("Invalid persisted Kaira planning trigger inbox record");
  const record = value as Partial<KairaActivityPlanningTriggerInboxRecord>;
  const ownerUserId = ownerKey(record.ownerUserId);
  const instance = resolveKairaInstanceContext({
    instanceId: String(record.kairaInstanceId || ""),
    instanceType: record.instanceType,
  });
  if (!ownerUserId || !record.trigger || (record.status !== "pending" && record.status !== "consumed")) {
    throw new Error("Invalid persisted Kaira planning trigger inbox record");
  }
  if (!instancePolicy(instance.instanceType).autonomousActivityPlanning) {
    throw new Error("Kaira instance cannot own planning trigger inbox records");
  }
  const normalized: KairaActivityPlanningTriggerInboxRecord = {
    schemaVersion: 1,
    ownerUserId,
    kairaInstanceId: instance.instanceId,
    instanceType: instance.instanceType,
    trigger: normalizeKairaActivityPlanningTrigger(record.trigger),
    status: record.status,
    enqueuedAt: canonicalTime(String(record.enqueuedAt || ""), "enqueue time"),
    ...(record.consumedAt
      ? { consumedAt: canonicalTime(String(record.consumedAt), "consume time") }
      : {}),
  };
  if (normalized.status === "consumed" && !normalized.consumedAt) {
    throw new Error("Invalid persisted Kaira planning trigger inbox record");
  }
  return normalized;
}

function sameDelivery(
  left: KairaActivityPlanningTriggerInboxRecord,
  right: KairaActivityPlanningTriggerInboxRecord,
): boolean {
  return (
    left.ownerUserId === right.ownerUserId &&
    left.kairaInstanceId === right.kairaInstanceId &&
    left.instanceType === right.instanceType &&
    JSON.stringify(left.trigger) === JSON.stringify(right.trigger)
  );
}

export async function enqueueKairaActivityPlanningTriggerAtomic(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  trigger: KairaActivityPlanningTrigger;
  now: string;
}): Promise<{ status: "enqueued" | "replayed"; record: KairaActivityPlanningTriggerInboxRecord }> {
  const ownerUserId = ownerKey(input.ownerUserId);
  const instance = resolveKairaInstanceContext({
    instanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
  });
  if (!ownerUserId) throw new Error("Invalid Kaira planning trigger inbox owner");
  if (!instancePolicy(instance.instanceType).autonomousActivityPlanning) {
    throw new Error("Kaira instance cannot own planning trigger inbox records");
  }
  const trigger = normalizeKairaActivityPlanningTrigger(input.trigger);
  const next: KairaActivityPlanningTriggerInboxRecord = {
    schemaVersion: 1,
    ownerUserId,
    kairaInstanceId: instance.instanceId,
    instanceType: instance.instanceType,
    trigger,
    status: "pending",
    enqueuedAt: canonicalTime(input.now, "enqueue time"),
  };
  const ref = doc(db, COLLECTION, documentId(instance.instanceId, trigger.triggerId));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      const current = normalizeRecord(snapshot.data());
      if (!sameDelivery(current, next)) throw new Error("Kaira planning trigger inbox idempotency conflict");
      return { status: "replayed", record: current } as const;
    }
    transaction.set(ref, next);
    return { status: "enqueued", record: next } as const;
  });
}

export async function listPendingKairaActivityPlanningTriggers(input: {
  batchSize?: number;
} = {}): Promise<KairaActivityPlanningTriggerInboxRecord[]> {
  const snapshot = await getDocs(query(
    collection(db, COLLECTION),
    where("status", "==", "pending"),
    limit(boundedBatchSize(input.batchSize)),
  ));
  const records: KairaActivityPlanningTriggerInboxRecord[] = [];
  for (const item of snapshot.docs) {
    try {
      const record = normalizeRecord(item.data());
      if (record.status === "pending") records.push(record);
    } catch {
      // Malformed persisted rows are never treated as executable planning work.
    }
  }
  return records;
}

export async function markKairaActivityPlanningTriggerConsumedAtomic(input: {
  record: KairaActivityPlanningTriggerInboxRecord;
  now: string;
}): Promise<KairaActivityPlanningTriggerInboxRecord> {
  const expected = normalizeRecord(input.record);
  const ref = doc(db, COLLECTION, documentId(expected.kairaInstanceId, expected.trigger.triggerId));
  const consumedAt = canonicalTime(input.now, "consume time");
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Kaira planning trigger inbox record not found");
    const current = normalizeRecord(snapshot.data());
    if (!sameDelivery(current, expected)) throw new Error("Kaira planning trigger inbox idempotency conflict");
    if (current.status === "consumed") return current;
    const consumed: KairaActivityPlanningTriggerInboxRecord = {
      ...current,
      status: "consumed",
      consumedAt,
    };
    transaction.set(ref, consumed);
    return consumed;
  });
}
