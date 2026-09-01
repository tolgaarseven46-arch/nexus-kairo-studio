import type {
  KairaActivityExecutionCommand,
  KairaActivityExecutionRecord,
} from "./kairaActivityExecution";

export type KairaActivityPermissionRequestStatus =
  | "pending"
  | "granted"
  | "denied"
  | "expired"
  | "cancelled";

export interface KairaActivityPermissionDialogueRequest {
  schemaVersion: 1;
  requestId: string;
  ownerUserId: string;
  kairaInstanceId: string;
  activityId: string;
  sessionId: string;
  promptTurnId: string;
  status: KairaActivityPermissionRequestStatus;
  createdAt: string;
  expiresAt?: string;
  resolvedAt?: string;
}

export type KairaActivityPermissionReplyIntent = "grant" | "deny" | "unmatched";

export type KairaActivityPermissionReplyDecision =
  | {
      status: "matched";
      intent: "grant" | "deny";
      request: KairaActivityPermissionDialogueRequest;
      command: Extract<KairaActivityExecutionCommand, { type: "grant_permission" | "deny_permission" }>;
    }
  | {
      status: "unmatched";
      intent: "unmatched";
      request: KairaActivityPermissionDialogueRequest;
      reason:
        | "request_not_pending"
        | "request_expired"
        | "owner_mismatch"
        | "session_mismatch"
        | "prompt_correlation_mismatch"
        | "reply_not_bounded_permission_answer";
    };

const canonicalOwner = (value: string) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_@.+:-]+/g, "_")
    .slice(0, 160);

const canonicalKey = (value: string) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

const canonicalOpaqueId = (value: string) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9_@.+:-]+/g, "_")
    .slice(0, 180);

const normalizeReply = (value: string) =>
  String(value || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/[’']/g, "'")
    .replace(/[.!?…]+$/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

const GRANT_RE = /^(?:evet|eved|evt|he|hee|hıhı|hihi|olur|olur git|git|gidebilirsin|tabii|tabi|tamam|tamamdır|ok|okey|izin veriyorum)$/u;
const DENY_RE = /^(?:hayır|hayir|yok|olmaz|gitme|bugün gitme|bugun gitme|istemiyorum|izin vermiyorum|kal)$/u;

export function classifyKairaActivityPermissionReply(message: string): KairaActivityPermissionReplyIntent {
  const normalized = normalizeReply(message);
  if (GRANT_RE.test(normalized)) return "grant";
  if (DENY_RE.test(normalized)) return "deny";
  return "unmatched";
}

export function createKairaActivityPermissionDialogueRequest(input: {
  execution: KairaActivityExecutionRecord;
  sessionId: string;
  promptTurnId: string;
  now: string;
  expiresAt?: string;
}): KairaActivityPermissionDialogueRequest {
  if (
    input.execution.phase !== "planned" ||
    input.execution.permissionPolicy !== "owner_approval" ||
    input.execution.permissionStatus !== "pending"
  ) {
    throw new Error("Pending owner-approved Kaira activity execution required");
  }

  const ownerUserId = canonicalOwner(input.execution.ownerUserId);
  const activityId = canonicalKey(input.execution.activityId);
  const sessionId = canonicalOpaqueId(input.sessionId);
  const promptTurnId = canonicalOpaqueId(input.promptTurnId);
  const nowMs = Date.parse(input.now);
  const expiresAtMs = input.expiresAt ? Date.parse(input.expiresAt) : undefined;
  if (
    !ownerUserId ||
    !activityId ||
    !sessionId ||
    !promptTurnId ||
    !Number.isFinite(nowMs) ||
    (expiresAtMs !== undefined && (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs))
  ) {
    throw new Error("Invalid Kaira activity permission dialogue request");
  }

  const requestId = canonicalOpaqueId(
    `${input.execution.kairaInstanceId}:${activityId}:${sessionId}:${promptTurnId}`,
  );
  return {
    schemaVersion: 1,
    requestId,
    ownerUserId,
    kairaInstanceId: input.execution.kairaInstanceId,
    activityId,
    sessionId,
    promptTurnId,
    status: "pending",
    createdAt: new Date(nowMs).toISOString(),
    ...(expiresAtMs !== undefined ? { expiresAt: new Date(expiresAtMs).toISOString() } : {}),
  };
}

export function resolveKairaActivityPermissionReply(input: {
  request: KairaActivityPermissionDialogueRequest;
  replyingUserId: string;
  sessionId: string;
  previousAssistantTurnId: string;
  message: string;
  now: string;
}): KairaActivityPermissionReplyDecision {
  const request = input.request;
  if (request.status !== "pending") {
    return { status: "unmatched", intent: "unmatched", request, reason: "request_not_pending" };
  }

  const nowMs = Date.parse(input.now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira activity permission reply time");
  if (request.expiresAt && nowMs > Date.parse(request.expiresAt)) {
    return { status: "unmatched", intent: "unmatched", request, reason: "request_expired" };
  }
  if (canonicalOwner(input.replyingUserId) !== request.ownerUserId) {
    return { status: "unmatched", intent: "unmatched", request, reason: "owner_mismatch" };
  }
  if (canonicalOpaqueId(input.sessionId) !== request.sessionId) {
    return { status: "unmatched", intent: "unmatched", request, reason: "session_mismatch" };
  }
  if (canonicalOpaqueId(input.previousAssistantTurnId) !== request.promptTurnId) {
    return {
      status: "unmatched",
      intent: "unmatched",
      request,
      reason: "prompt_correlation_mismatch",
    };
  }

  const intent = classifyKairaActivityPermissionReply(input.message);
  if (intent === "unmatched") {
    return {
      status: "unmatched",
      intent,
      request,
      reason: "reply_not_bounded_permission_answer",
    };
  }

  return {
    status: "matched",
    intent,
    request,
    command: {
      type: intent === "grant" ? "grant_permission" : "deny_permission",
      authority: "activity_permission_controller",
      decidedByUserId: request.ownerUserId,
    },
  };
}

export function settleKairaActivityPermissionDialogueRequest(
  request: KairaActivityPermissionDialogueRequest,
  intent: "grant" | "deny",
  now: string,
): KairaActivityPermissionDialogueRequest {
  if (request.status !== "pending") return request;
  const nowMs = Date.parse(now);
  if (!Number.isFinite(nowMs)) throw new Error("Invalid Kaira activity permission settlement time");
  return {
    ...request,
    status: intent === "grant" ? "granted" : "denied",
    resolvedAt: new Date(nowMs).toISOString(),
  };
}
