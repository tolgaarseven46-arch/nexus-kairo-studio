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
const MAX_DEFER_MINUTES = 60;

export interface KairaActivityPlanningTriggerInboxRecord {
  schemaVersion: 1;
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  trigger: KairaActivityPlanningTrigger;
  status: "pending" | "deferred" | "consumed";
  enqueuedAt: string;
  deferredAt?: string;
  retryAfter?: string;
  attemptCount?: number;
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

function validInstanceType(value: unknown): value is KairaInstanceContext["instanceType"] {
  return value === "reference" || value === "welcome" || value === "individual";
}

function normalizeRecord(value: unknown): KairaActivityPlanningTriggerInboxRecord {
  if (!value || typeof value !== "object") throw new Error("Invalid persisted Kaira planning trigger inbox record");
  const record = value as Partial<KairaActivityPlanningTriggerInboxRecord>;
  if (
    record.schemaVersion !== 1 ||
    !String(record.kairaInstanceId || "").trim() ||
    !validInstanceType(record.instanceType)
  ) {
    throw new Error("Invalid persisted Kaira planning trigger inbox record");
  }
  const ownerUserId = ownerKey(record.ownerUserId);
  const instance = resolveKairaInstanceContext({
    instanceId: record.kairaInstanceId,
    instanceType: record.instanceType,
  });
  if (
    !ownerUserId ||
    !record.trigger ||
    (record.status !== "pending" && record.status !== "deferred" && record.status !== "consumed")
  ) {
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
    ...(record.deferredAt
      ? { deferredAt: canonicalTime(String(record.deferredAt), "defer time") }
      : {}),
    ...(record.retryAfter
      ? { retryAfter: canonicalTime(String(record.retryAfter), "retry time") }
      : {}),
    ...(Number.isInteger(record.attemptCount) && Number(record.attemptCount) >= 0
      ? { attemptCount: Number(record.attemptCount) }
      : {}),
    ...(record.consumedAt
      ? { consumedAt: canonicalTime(String(record.consumedAt), "consume time") }
      : {}),
  };
  if (normalized.status === "consumed" && !normalized.consumedAt) {
    throw new Error("Invalid persisted Kaira planning trigger inbox record");
  }
  if (
    normalized.status === "deferred" &&
    (!normalized.deferredAt || !normalized.retryAfter || !normalized.attemptCount || normalized.attemptCount < 1)
  ) {
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

function retryAfter(now: string, previousAttempts: number): string {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira planning trigger inbox defer time");
  const minutes = Math.min(MAX_DEFER_MINUTES, Math.max(1, 2 ** Math.min(previousAttempts, 6)));
  return new Date(nowMs + minutes * 60_000).toISOString();
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
    attemptCount: 0,
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

async function readStatusBatch(status: "pending" | "deferred", batchSize: number, now?: string) {
  const constraints = [where("status", "==", status)];
  if (status === "deferred") {
    if (!now) return [];
    constraints.push(where("retryAfter", "<=", canonicalTime(now, "retry discovery time")));
  }
  const snapshot = await getDocs(query(
    collection(db, COLLECTION),
    ...constraints,
    limit(batchSize),
  ));
  const records: KairaActivityPlanningTriggerInboxRecord[] = [];
  for (const item of snapshot.docs) {
    try {
      const record = normalizeRecord(item.data());
      if (record.status === status) records.push(record);
    } catch {
      // Malformed persisted rows are never treated as executable planning work.
    }
  }
  return records;
}

export async function listPendingKairaActivityPlanningTriggers(input: {
  batchSize?: number;
  now?: string;
} = {}): Promise<KairaActivityPlanningTriggerInboxRecord[]> {
  const batchSize = boundedBatchSize(input.batchSize);
  const pending = await readStatusBatch("pending", batchSize);
  const deferred = input.now
    ? await readStatusBatch("deferred", batchSize, input.now)
    : [];
  return [...deferred, ...pending]
    .sort((left, right) => Date.parse(left.enqueuedAt) - Date.parse(right.enqueuedAt))
    .slice(0, batchSize);
}

export async function markKairaActivityPlanningTriggerDeferredAtomic(input: {
  record: KairaActivityPlanningTriggerInboxRecord;
  now: string;
}): Promise<KairaActivityPlanningTriggerInboxRecord> {
  const expected = normalizeRecord(input.record);
  const ref = doc(db, COLLECTION, documentId(expected.kairaInstanceId, expected.trigger.triggerId));
  const deferredAt = canonicalTime(input.now, "defer time");
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Kaira planning trigger inbox record not found");
    const current = normalizeRecord(snapshot.data());
    if (!sameDelivery(current, expected)) throw new Error("Kaira planning trigger inbox idempotency conflict");
    if (current.status === "consumed") return current;
    const attemptCount = Math.max(0, current.attemptCount || 0) + 1;
    const { consumedAt: _consumedAt, ...withoutConsumption } = current;
    const deferred: KairaActivityPlanningTriggerInboxRecord = {
      ...withoutConsumption,
      status: "deferred",
      deferredAt,
      retryAfter: retryAfter(deferredAt, attemptCount - 1),
      attemptCount,
    };
    transaction.set(ref, deferred);
    return deferred;
  });
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
    const { deferredAt: _deferredAt, retryAfter: _retryAfter, ...withoutDeferral } = current;
    const consumed: KairaActivityPlanningTriggerInboxRecord = {
      ...withoutDeferral,
      status: "consumed",
      consumedAt,
    };
    transaction.set(ref, consumed);
    return consumed;
  });
}
