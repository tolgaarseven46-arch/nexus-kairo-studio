import { doc, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import { kairaOwnerScope } from "./kairaInstanceContext";
import {
  createKairaActivityExecution,
  transitionKairaActivityExecution,
  type KairaActivityExecutionCommand,
  type KairaActivityExecutionRecord,
  type KairaActivityExecutionTransitionDecision,
  type KairaActivityPermissionPolicy,
} from "./kairaActivityExecution";
import type { KairaInstanceContext } from "./kairaInstanceContext";

const ACTIVITY_EXECUTION_COLLECTION = "kairaActivityExecutions";

const canonicalKey = (value: string) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

function executionDocumentId(ownerUserId: string, kairaInstanceId: string, activityId: string): string {
  const ownerScope = kairaOwnerScope(ownerUserId, kairaInstanceId);
  const activityKey = canonicalKey(activityId);
  return `${ownerScope}__activity__${activityKey}`.slice(0, 480);
}

function sameExecutionSeed(
  record: KairaActivityExecutionRecord,
  input: {
    ownerUserId: string;
    kairaInstanceId: string;
    instanceType: KairaInstanceContext["instanceType"];
    activityId: string;
    activityType: string;
    permissionPolicy?: KairaActivityPermissionPolicy;
  },
): boolean {
  const expected = createKairaActivityExecution({
    ...input,
    permissionPolicy: input.permissionPolicy,
    now: record.createdAt,
  });
  return (
    record.ownerUserId === expected.ownerUserId &&
    record.kairaInstanceId === expected.kairaInstanceId &&
    record.instanceType === expected.instanceType &&
    record.activityId === expected.activityId &&
    record.activityType === expected.activityType &&
    record.permissionPolicy === expected.permissionPolicy
  );
}

export type KairaActivityExecutionCreateResult =
  | { status: "created"; record: KairaActivityExecutionRecord }
  | { status: "existing"; record: KairaActivityExecutionRecord };

export async function createKairaActivityExecutionAtomic(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  activityId: string;
  activityType: string;
  permissionPolicy?: KairaActivityPermissionPolicy;
  now: string;
}): Promise<KairaActivityExecutionCreateResult> {
  const seed = createKairaActivityExecution(input);
  const ref = doc(
    db,
    ACTIVITY_EXECUTION_COLLECTION,
    executionDocumentId(seed.ownerUserId, seed.kairaInstanceId, seed.activityId),
  );

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists()) {
      const existing = snapshot.data() as KairaActivityExecutionRecord;
      if (!sameExecutionSeed(existing, input)) {
        throw new Error("Kaira activity execution idempotency conflict");
      }
      return { status: "existing", record: existing } as const;
    }
    transaction.set(ref, seed);
    return { status: "created", record: seed } as const;
  });
}

export async function transitionKairaActivityExecutionAtomic(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  activityId: string;
  command: KairaActivityExecutionCommand;
  now: string;
}): Promise<KairaActivityExecutionTransitionDecision> {
  const ref = doc(
    db,
    ACTIVITY_EXECUTION_COLLECTION,
    executionDocumentId(input.ownerUserId, input.kairaInstanceId, input.activityId),
  );

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) {
      throw new Error("Kaira activity execution not found");
    }
    const record = snapshot.data() as KairaActivityExecutionRecord;
    if (
      record.ownerUserId !== createKairaActivityExecution({
        ownerUserId: input.ownerUserId,
        kairaInstanceId: input.kairaInstanceId,
        instanceType: record.instanceType,
        activityId: input.activityId,
        activityType: record.activityType,
        permissionPolicy: record.permissionPolicy,
        now: record.createdAt,
      }).ownerUserId ||
      record.kairaInstanceId !== input.kairaInstanceId ||
      record.activityId !== canonicalKey(input.activityId)
    ) {
      throw new Error("Kaira activity execution owner mismatch");
    }

    const decision = transitionKairaActivityExecution(record, input.command, input.now);
    if (decision.status === "applied") transaction.set(ref, decision.record);
    return decision;
  });
}
