import {
  instancePolicy,
  resolveKairaInstanceContext,
  type KairaInstanceContext,
} from "./kairaInstanceContext";

export type KairaActivityExecutionPhase =
  | "planned"
  | "active"
  | "completed"
  | "cancelled"
  | "failed";

export type KairaActivityPermissionPolicy = "none" | "owner_approval";
export type KairaActivityPermissionStatus =
  | "not_required"
  | "pending"
  | "granted"
  | "denied";

export interface KairaActivityExecutionRecord {
  schemaVersion: 1;
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  activityId: string;
  activityType: string;
  phase: KairaActivityExecutionPhase;
  permissionPolicy: KairaActivityPermissionPolicy;
  permissionStatus: KairaActivityPermissionStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  terminalReason?: string;
}

export type KairaActivityExecutionCommand =
  | {
      type: "grant_permission";
      authority: "activity_permission_controller";
      decidedByUserId: string;
    }
  | {
      type: "deny_permission";
      authority: "activity_permission_controller";
      decidedByUserId: string;
    }
  | { type: "start"; authority: "kaira_activity_executor" }
  | { type: "complete"; authority: "kaira_activity_executor" }
  | { type: "cancel"; authority: "kaira_activity_executor"; reason?: string }
  | { type: "fail"; authority: "kaira_activity_executor"; reason?: string };

export type KairaActivityExecutionTransitionDecision =
  | { status: "applied"; record: KairaActivityExecutionRecord }
  | {
      status: "rejected";
      record: KairaActivityExecutionRecord;
      reason:
        | "terminal_activity"
        | "permission_not_required"
        | "permission_already_decided"
        | "permission_owner_mismatch"
        | "permission_required"
        | "invalid_phase"
        | "invalid_authority";
    };

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

const terminal = (phase: KairaActivityExecutionPhase) =>
  phase === "completed" || phase === "cancelled" || phase === "failed";

export function createKairaActivityExecution(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  instanceType: KairaInstanceContext["instanceType"];
  activityId: string;
  activityType: string;
  permissionPolicy?: KairaActivityPermissionPolicy;
  now: string;
}): KairaActivityExecutionRecord {
  const instance = resolveKairaInstanceContext({
    instanceId: input.kairaInstanceId,
    instanceType: input.instanceType,
  });
  const policy = instancePolicy(instance.instanceType);
  if (!policy.persistentIdentity || !policy.persistentWorldModel) {
    throw new Error(`Kaira instance cannot own activity execution: ${instance.instanceType}`);
  }

  const ownerUserId = canonicalOwner(input.ownerUserId);
  const activityId = canonicalKey(input.activityId);
  const activityType = canonicalKey(input.activityType);
  const nowMs = Date.parse(input.now);
  if (!ownerUserId || !activityId || !activityType || !Number.isFinite(nowMs)) {
    throw new Error("Invalid Kaira activity execution seed");
  }

  const permissionPolicy = input.permissionPolicy || "none";
  return {
    schemaVersion: 1,
    ownerUserId,
    kairaInstanceId: instance.instanceId,
    instanceType: instance.instanceType,
    activityId,
    activityType,
    phase: "planned",
    permissionPolicy,
    permissionStatus: permissionPolicy === "owner_approval" ? "pending" : "not_required",
    createdAt: new Date(nowMs).toISOString(),
    updatedAt: new Date(nowMs).toISOString(),
  };
}

function reject(
  record: KairaActivityExecutionRecord,
  reason: Extract<KairaActivityExecutionTransitionDecision, { status: "rejected" }>["reason"],
): KairaActivityExecutionTransitionDecision {
  return { status: "rejected", record, reason };
}

export function transitionKairaActivityExecution(
  record: KairaActivityExecutionRecord,
  command: KairaActivityExecutionCommand,
  now: string,
): KairaActivityExecutionTransitionDecision {
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira activity transition time");
  if (terminal(record.phase)) return reject(record, "terminal_activity");

  const updatedAt = new Date(nowMs).toISOString();
  const withUpdate = (patch: Partial<KairaActivityExecutionRecord>): KairaActivityExecutionRecord => ({
    ...record,
    ...patch,
    updatedAt,
  });

  if (command.type === "grant_permission" || command.type === "deny_permission") {
    if (command.authority !== "activity_permission_controller") return reject(record, "invalid_authority");
    if (record.permissionPolicy !== "owner_approval") return reject(record, "permission_not_required");
    if (record.phase !== "planned") return reject(record, "invalid_phase");
    if (record.permissionStatus !== "pending") return reject(record, "permission_already_decided");
    if (canonicalOwner(command.decidedByUserId) !== record.ownerUserId) {
      return reject(record, "permission_owner_mismatch");
    }
    return {
      status: "applied",
      record: withUpdate({
        permissionStatus: command.type === "grant_permission" ? "granted" : "denied",
      }),
    };
  }

  if (command.authority !== "kaira_activity_executor") return reject(record, "invalid_authority");

  if (command.type === "start") {
    if (record.phase !== "planned") return reject(record, "invalid_phase");
    if (record.permissionPolicy === "owner_approval" && record.permissionStatus !== "granted") {
      return reject(record, "permission_required");
    }
    return {
      status: "applied",
      record: withUpdate({ phase: "active", startedAt: updatedAt }),
    };
  }

  if (command.type === "complete") {
    if (record.phase !== "active") return reject(record, "invalid_phase");
    return {
      status: "applied",
      record: withUpdate({ phase: "completed", completedAt: updatedAt }),
    };
  }

  if (command.type === "cancel") {
    if (record.phase !== "planned" && record.phase !== "active") return reject(record, "invalid_phase");
    return {
      status: "applied",
      record: withUpdate({
        phase: "cancelled",
        terminalReason: String(command.reason || "cancelled").trim().slice(0, 160),
      }),
    };
  }

  if (record.phase !== "active") return reject(record, "invalid_phase");
  return {
    status: "applied",
    record: withUpdate({
      phase: "failed",
      terminalReason: String(command.reason || "failed").trim().slice(0, 160),
    }),
  };
}
