import { doc, runTransaction } from "firebase/firestore";
import { db } from "../lib/firebase";
import { kairaOwnerScope } from "./kairaInstanceContext";
import {
  createKairaActivityExecution,
  transitionKairaActivityExecution,
  type KairaActivityExecutionCommand,
  type KairaActivityExecutionExperienceSubject,
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

const canonicalOwner = (value: string) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_@.+:-]+/g, "_")
    .slice(0, 160);

function executionDocumentId(ownerUserId: string, kairaInstanceId: string, activityId: string): string {
  const ownerScope = kairaOwnerScope(ownerUserId, kairaInstanceId);
  const activityKey = canonicalKey(activityId);
  return `${ownerScope}__activity__${activityKey}`.slice(0, 480);
}

const valueKey = (value: string | number | boolean) =>
  `${typeof value}:${typeof value === "string" ? value.trim().toLocaleLowerCase("tr-TR") : String(value)}`;

function sameExperienceSubject(
  left?: KairaActivityExecutionExperienceSubject,
  right?: KairaActivityExecutionExperienceSubject,
): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.preferenceKey === right.preferenceKey && valueKey(left.experiencedValue) === valueKey(right.experiencedValue);
}

function sameExecutionSeed(
  record: KairaActivityExecutionRecord,
  input: {
    ownerUserId: string;
    kairaInstanceId: string;
    instanceType: KairaInstanceContext["instanceType"];
    activityId: string;
    activityType: string;
    experienceSubject?: KairaActivityExecutionExperienceSubject;
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
    record.permissionPolicy === expected.permissionPolicy &&
    sameExperienceSubject(record.experienceSubject, expected.experienceSubject)
  );
}

function exactCommandAlreadyApplied(
  record: KairaActivityExecutionRecord,
  command: KairaActivityExecutionCommand,
): boolean {
  if (command.type === "grant_permission") {
    return (
      command.authority === "activity_permission_controller" &&
      canonicalOwner(command.decidedByUserId) === record.ownerUserId &&
      record.permissionStatus === "granted" &&
      record.phase === "planned"
    );
  }
  if (command.type === "deny_permission") {
    return (
      command.authority === "activity_permission_controller" &&
      canonicalOwner(command.decidedByUserId) === record.ownerUserId &&
      record.permissionStatus === "denied" &&
      record.phase === "planned"
    );
  }
  if (command.type === "start") return record.phase === "active";
  if (command.type === "complete") return record.phase === "completed";
  if (command.type === "cancel") return record.phase === "cancelled";
  return record.phase === "failed";
}

function validateExecutionOwner(
  record: KairaActivityExecutionRecord,
  input: { ownerUserId: string; kairaInstanceId: string; activityId: string },
): void {
  const expected = createKairaActivityExecution({
    ownerUserId: input.ownerUserId,
    kairaInstanceId: input.kairaInstanceId,
    instanceType: record.instanceType,
    activityId: input.activityId,
    activityType: record.activityType,
    experienceSubject: record.experienceSubject,
    permissionPolicy: record.permissionPolicy,
    now: record.createdAt,
  });
  if (
    record.ownerUserId !== expected.ownerUserId ||
    record.kairaInstanceId !== expected.kairaInstanceId ||
    record.activityId !== expected.activityId
  ) {
    throw new Error("Kaira activity execution owner mismatch");
  }
}

export type KairaActivityExecutionCreateResult =
  | { status: "created"; record: KairaActivityExecutionRecord }
  | { status: "existing"; record: KairaActivityExecutionRecord };

export type KairaActivityExecutionCommandResult =
  | { status: "applied" | "replayed"; record: KairaActivityExecutionRecord }
  | Extract<KairaActivityExecutionTransitionDecision, { status: "rejected" }>;

export async function createKairaActivityExecutionAtomic(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  activityId: string;
  activityType: string;
  experienceSubject?: KairaActivityExecutionExperienceSubject;
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
    if (!snapshot.exists()) throw new Error("Kaira activity execution not found");
    const record = snapshot.data() as KairaActivityExecutionRecord;
    validateExecutionOwner(record, input);

    const decision = transitionKairaActivityExecution(record, input.command, input.now);
    if (decision.status === "applied") transaction.set(ref, decision.record);
    return decision;
  });
}

/**
 * Retry-safe command seam. The pure state machine remains strict/immutable;
 * only an exact command whose intended result is already canonical is replayed.
 */
export async function applyKairaActivityExecutionCommandAtomic(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  activityId: string;
  command: KairaActivityExecutionCommand;
  now: string;
}): Promise<KairaActivityExecutionCommandResult> {
  const ref = doc(
    db,
    ACTIVITY_EXECUTION_COLLECTION,
    executionDocumentId(input.ownerUserId, input.kairaInstanceId, input.activityId),
  );

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Kaira activity execution not found");
    const record = snapshot.data() as KairaActivityExecutionRecord;
    validateExecutionOwner(record, input);

    if (exactCommandAlreadyApplied(record, input.command)) {
      return { status: "replayed", record } as const;
    }

    const decision = transitionKairaActivityExecution(record, input.command, input.now);
    if (decision.status === "applied") {
      transaction.set(ref, decision.record);
      return { status: "applied", record: decision.record } as const;
    }
    return decision;
  });
}
