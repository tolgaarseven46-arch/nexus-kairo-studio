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

const activityLabel = (value: string) =>
  String(value || "")
    .trim()
    .replace(/[_:-]+/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 120);

export function buildKairaActivityPermissionChatPrompt(input: {
  requestId: string;
  activityId: string;
  activityType?: string;
}): KairaActivityPermissionChatPrompt {
  const label = activityLabel(input.activityType || input.activityId) || "planladığım aktivite";
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
