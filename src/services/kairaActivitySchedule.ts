import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";

export type KairaActivityScheduleStatus = "scheduled" | "dispatched" | "cancelled";

export interface KairaActivityScheduleRecord {
  schemaVersion: 1;
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  activityId: string;
  notBefore: string;
  expiresAt?: string;
  status: KairaActivityScheduleStatus;
  createdAt: string;
  updatedAt: string;
  dispatchedAt?: string;
  cancelledAt?: string;
}

export type KairaActivityScheduleEvaluation =
  | { status: "not_due"; record: KairaActivityScheduleRecord }
  | { status: "due"; record: KairaActivityScheduleRecord }
  | { status: "expired"; record: KairaActivityScheduleRecord }
  | { status: "already_dispatched"; record: KairaActivityScheduleRecord }
  | { status: "cancelled"; record: KairaActivityScheduleRecord };

const canonicalKey = (value: string) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

const canonicalOwner = (value: string) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_@.+:-]+/g, "_")
    .slice(0, 160);

export function createKairaActivitySchedule(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  activityId: string;
  notBefore: string;
  expiresAt?: string;
  now: string;
}): KairaActivityScheduleRecord {
  const instance = resolveKairaInstanceContext({
    instanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
  });
  const policy = instancePolicy(instance.instanceType);
  if (!policy.persistentIdentity || !policy.persistentWorldModel) {
    throw new Error(`Kaira instance cannot own activity schedule: ${instance.instanceType}`);
  }

  const ownerUserId = canonicalOwner(input.ownerUserId);
  const activityId = canonicalKey(input.activityId);
  const nowMs = Date.parse(input.now);
  const notBeforeMs = Date.parse(input.notBefore);
  const expiresAtMs = input.expiresAt ? Date.parse(input.expiresAt) : undefined;
  if (
    !ownerUserId ||
    !activityId ||
    !Number.isFinite(nowMs) ||
    !Number.isFinite(notBeforeMs) ||
    (expiresAtMs !== undefined && (!Number.isFinite(expiresAtMs) || expiresAtMs <= notBeforeMs))
  ) {
    throw new Error("Invalid Kaira activity schedule");
  }

  return {
    schemaVersion: 1,
    ownerUserId,
    kairaInstanceId: instance.instanceId,
    instanceType: instance.instanceType,
    activityId,
    notBefore: new Date(notBeforeMs).toISOString(),
    ...(expiresAtMs !== undefined ? { expiresAt: new Date(expiresAtMs).toISOString() } : {}),
    status: "scheduled",
    createdAt: new Date(nowMs).toISOString(),
    updatedAt: new Date(nowMs).toISOString(),
  };
}

export function evaluateKairaActivitySchedule(
  record: KairaActivityScheduleRecord,
  now: string,
): KairaActivityScheduleEvaluation {
  const nowMs = Date.parse(now);
  const notBeforeMs = Date.parse(record.notBefore);
  const expiresAtMs = record.expiresAt ? Date.parse(record.expiresAt) : undefined;
  if (!Number.isFinite(nowMs) || !Number.isFinite(notBeforeMs)) {
    throw new Error("Invalid Kaira activity schedule time");
  }
  if (record.status === "dispatched") return { status: "already_dispatched", record };
  if (record.status === "cancelled") return { status: "cancelled", record };
  if (expiresAtMs !== undefined && nowMs > expiresAtMs) return { status: "expired", record };
  if (nowMs < notBeforeMs) return { status: "not_due", record };
  return { status: "due", record };
}

export function markKairaActivityScheduleDispatched(
  record: KairaActivityScheduleRecord,
  now: string,
): KairaActivityScheduleRecord {
  const evaluation = evaluateKairaActivitySchedule(record, now);
  if (evaluation.status === "already_dispatched") return record;
  if (evaluation.status !== "due") throw new Error(`Kaira activity schedule cannot dispatch: ${evaluation.status}`);
  const dispatchedAt = new Date(Date.parse(now)).toISOString();
  return {
    ...record,
    status: "dispatched",
    updatedAt: dispatchedAt,
    dispatchedAt,
  };
}

export function cancelKairaActivitySchedule(
  record: KairaActivityScheduleRecord,
  now: string,
): KairaActivityScheduleRecord {
  if (record.status === "dispatched") throw new Error("Dispatched Kaira activity schedule cannot be cancelled");
  if (record.status === "cancelled") return record;
  const cancelledAt = new Date(Date.parse(now)).toISOString();
  if (!Number.isFinite(Date.parse(now))) throw new Error("Invalid Kaira activity schedule time");
  return {
    ...record,
    status: "cancelled",
    updatedAt: cancelledAt,
    cancelledAt,
  };
}
