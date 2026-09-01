import { doc, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import { instancePolicy, resolveKairaInstanceContext, type KairaInstanceContext } from "./kairaInstanceContext";
import type { KairaActivityPlanningTrigger } from "./kairaActivityPlanningTrigger";

const COLLECTION = "kairaActivityPlanningTriggers";

export interface KairaActivityPlanningTriggerReceipt {
  schemaVersion: 1;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  triggerId: string;
  triggerKind: KairaActivityPlanningTrigger["kind"];
  sourceId: string;
  occurredAt: string;
  status: "claimed" | "completed";
  claimedAt: string;
  leaseUntil: string;
  completedAt?: string;
}

export type KairaActivityPlanningTriggerClaimResult =
  | { status: "claimed" | "reclaimed"; receipt: KairaActivityPlanningTriggerReceipt }
  | { status: "busy" | "replayed"; receipt: KairaActivityPlanningTriggerReceipt };

const key = (value: unknown) => String(value || "").trim().toLocaleLowerCase("en-US").replace(/[^a-z0-9_:-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 120);

function identity(input: { kairaInstanceId: string; instanceType: KairaInstanceContext["instanceType"]; trigger: KairaActivityPlanningTrigger }) {
  const instance = resolveKairaInstanceContext({ instanceId: input.kairaInstanceId, instanceType: input.instanceType });
  if (!instancePolicy(instance.instanceType).autonomousActivityPlanning) throw new Error("Kaira instance cannot own planning triggers");
  const triggerId = key(input.trigger.triggerId);
  const sourceId = key(input.trigger.sourceId);
  const occurredAtMs = Date.parse(input.trigger.occurredAt);
  if (!triggerId || !sourceId || !Number.isFinite(occurredAtMs)) throw new Error("Invalid Kaira planning trigger identity");
  return { instance, triggerId, sourceId, occurredAt: new Date(occurredAtMs).toISOString() };
}

function sameTrigger(receipt: KairaActivityPlanningTriggerReceipt, input: ReturnType<typeof identity> & { triggerKind: KairaActivityPlanningTrigger["kind"] }) {
  return receipt.kairaInstanceId === input.instance.instanceId && receipt.triggerId === input.triggerId && receipt.triggerKind === input.triggerKind && receipt.sourceId === input.sourceId && receipt.occurredAt === input.occurredAt;
}

/** Retry/concurrency boundary for planning evaluations. This store does not decide trigger materiality. */
export async function claimKairaActivityPlanningTrigger(input: {
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  trigger: KairaActivityPlanningTrigger;
  now: string;
  leaseMinutes?: number;
}): Promise<KairaActivityPlanningTriggerClaimResult> {
  const normalized = identity(input);
  const nowMs = Date.parse(input.now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira planning trigger claim time");
  const leaseMinutes = Math.max(1, Math.min(30, input.leaseMinutes || 5));
  const triggerKind = input.trigger.kind;
  const ref = doc(db, COLLECTION, `${normalized.instance.instanceId}__${normalized.triggerId}`.slice(0, 480));

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      const existing = snapshot.data() as KairaActivityPlanningTriggerReceipt;
      if (!sameTrigger(existing, { ...normalized, triggerKind })) throw new Error("Kaira planning trigger idempotency conflict");
      if (existing.status === "completed") return { status: "replayed", receipt: existing } as const;
      const leaseUntilMs = Date.parse(existing.leaseUntil);
      if (Number.isFinite(leaseUntilMs) && leaseUntilMs > nowMs) return { status: "busy", receipt: existing } as const;
      const reclaimed: KairaActivityPlanningTriggerReceipt = {
        ...existing,
        status: "claimed",
        claimedAt: new Date(nowMs).toISOString(),
        leaseUntil: new Date(nowMs + leaseMinutes * 60_000).toISOString(),
        completedAt: undefined,
      };
      transaction.set(ref, reclaimed);
      return { status: "reclaimed", receipt: reclaimed } as const;
    }

    const receipt: KairaActivityPlanningTriggerReceipt = {
      schemaVersion: 1,
      kairaInstanceId: normalized.instance.instanceId,
      instanceType: normalized.instance.instanceType,
      triggerId: normalized.triggerId,
      triggerKind,
      sourceId: normalized.sourceId,
      occurredAt: normalized.occurredAt,
      status: "claimed",
      claimedAt: new Date(nowMs).toISOString(),
      leaseUntil: new Date(nowMs + leaseMinutes * 60_000).toISOString(),
    };
    transaction.set(ref, receipt);
    return { status: "claimed", receipt } as const;
  });
}

export async function completeKairaActivityPlanningTrigger(input: {
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  trigger: KairaActivityPlanningTrigger;
  now: string;
}): Promise<KairaActivityPlanningTriggerReceipt> {
  const normalized = identity(input);
  const nowMs = Date.parse(input.now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira planning trigger completion time");
  const ref = doc(db, COLLECTION, `${normalized.instance.instanceId}__${normalized.triggerId}`.slice(0, 480));
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Kaira planning trigger claim not found");
    const existing = snapshot.data() as KairaActivityPlanningTriggerReceipt;
    if (!sameTrigger(existing, { ...normalized, triggerKind: input.trigger.kind })) throw new Error("Kaira planning trigger idempotency conflict");
    if (existing.status === "completed") return existing;
    const completed = { ...existing, status: "completed" as const, completedAt: new Date(nowMs).toISOString() };
    transaction.set(ref, completed);
    return completed;
  });
}
