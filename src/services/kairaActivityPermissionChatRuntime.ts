import type { KairaActivityExecutionRecord } from "./kairaActivityExecution";
import { listOpenKairaActivityExecutions } from "./kairaActivityExecutionStore";
import {
  applyKairaActivityPermissionDialogueReply,
  openKairaActivityPermissionDialogue,
  type KairaActivityPermissionDialogueApplyResult,
} from "./kairaActivityPermissionDialogueCoordinator";
import { loadActiveKairaActivityPermissionSessionPointer } from "./kairaActivityPermissionSessionPointerStore";

export interface KairaActivityPermissionChatPrompt {
  requestId: string;
  activityId: string;
  activityLabel: string;
  text: string;
}

export type KairaActivityPermissionChatResolution =
  | { status: "none" | "uncorrelated" }
  | { status: "unmatched" | "execution_rejected" | "applied"; result: KairaActivityPermissionDialogueApplyResult };

const INTERNAL_ACTIVITY_KEY_RE =
  /(?:planning_dynamic_state|dynamic_state_chat|chat_request|permission_request|activity_execution|planning_trigger|trigger_inbox|worker|runtime|kaira)/iu;

/**
 * Canonical activity types may use machine separators (e.g. `museum_visit`) and
 * can be rendered conservatively. Orchestration/correlation keys are not labels
 * and must degrade to generic copy instead of being prettified for the user.
 */
const activityLabel = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw || raw.length > 64 || INTERNAL_ACTIVITY_KEY_RE.test(raw)) return "";
  const normalized = raw
    .replace(/[_:-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized || normalized.split(/\s+/u).length > 5) return "";
  return normalized.slice(0, 120);
};

export function buildKairaActivityPermissionChatPrompt(input: {
  requestId: string;
  activityId: string;
  activityType?: string;
}): KairaActivityPermissionChatPrompt {
  // Never fall back to activityId: it is an internal correlation identifier.
  const label = activityLabel(input.activityType) || "planladığım aktivite";
  return {
    requestId: input.requestId,
    activityId: input.activityId,
    activityLabel: label,
    text: `Bu arada ${label} aktivitesini yapmam için izin veriyor musun? Evet ya da hayır diyebilirsin.`,
  };
}

export async function resolveKairaActivityPermissionChatReply(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  sessionId: string;
  permissionRequestId?: string;
  message: string;
  now: string;
}): Promise<KairaActivityPermissionChatResolution> {
  const pointer = await loadActiveKairaActivityPermissionSessionPointer(input);
  if (!pointer) return { status: "none" };
  if (!input.permissionRequestId || input.permissionRequestId !== pointer.request.requestId) {
    return { status: "uncorrelated" };
  }
  const result = await applyKairaActivityPermissionDialogueReply({
    request: pointer.request,
    replyingUserId: input.ownerUserId,
    sessionId: input.sessionId,
    previousAssistantTurnId: pointer.request.promptTurnId,
    message: input.message,
    now: input.now,
  });
  return { status: result.status, result };
}

const pendingOwnerApproval = (record: KairaActivityExecutionRecord) =>
  record.phase === "planned" &&
  record.permissionPolicy === "owner_approval" &&
  record.permissionStatus === "pending";

export async function presentKairaActivityPermissionChatPrompt(input: {
  ownerUserId: string;
  kairaInstanceId: string;
  sessionId: string;
  promptTurnId: string;
  now: string;
}): Promise<KairaActivityPermissionChatPrompt | null> {
  const active = await loadActiveKairaActivityPermissionSessionPointer(input);
  if (active) {
    return buildKairaActivityPermissionChatPrompt({
      requestId: active.request.requestId,
      activityId: active.request.activityId,
    });
  }

  const executions = await listOpenKairaActivityExecutions({
    ownerUserId: input.ownerUserId,
    kairaInstanceId: input.kairaInstanceId,
    batchSize: 100,
  });
  const execution = executions
    .filter(pendingOwnerApproval)
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))[0];
  if (!execution) return null;

  const opened = await openKairaActivityPermissionDialogue({
    execution,
    sessionId: input.sessionId,
    promptTurnId: input.promptTurnId,
    now: input.now,
  });
  return buildKairaActivityPermissionChatPrompt({
    requestId: opened.request.request.requestId,
    activityId: execution.activityId,
    activityType: execution.activityType,
  });
}

/**
 * Keep activity-permission UX out of the planner-owned assistant reply.
 * Prompt/resolution data is returned separately by the chat API and must be
 * rendered by the caller as structured UI, so it cannot bypass response-plan
 * constraints such as allowQuestion/maxSentences/maxWords.
 */
export function composeKairaActivityPermissionChatReply(input: {
  reply: string;
  resolution: KairaActivityPermissionChatResolution;
  prompt: KairaActivityPermissionChatPrompt | null;
}): string {
  return input.reply;
}
