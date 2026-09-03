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

const TRUTHY = new Set(["1", "true", "on", "yes"]);

/**
 * Autonomous/offscreen activity is not allowed to inject a new user-visible
 * question into ordinary chat until that side-channel is explicitly enabled and
 * covered by the final response-plan authority. This is an integration safety
 * gate, not a conversational decision.
 */
export function kairaActivityPermissionChatPromptsEnabled(): boolean {
  try {
    const raw = typeof process !== "undefined" ? process.env?.KAIRA_CHAT_ACTIVITY_PERMISSION_PROMPTS : undefined;
    return typeof raw === "string" && TRUTHY.has(raw.trim().toLowerCase());
  } catch {
    return false;
  }
}

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
  if (!kairaActivityPermissionChatPromptsEnabled()) return null;

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

export function composeKairaActivityPermissionChatReply(input: {
  reply: string;
  resolution: KairaActivityPermissionChatResolution;
  prompt: KairaActivityPermissionChatPrompt | null;
}): string {
  const parts: string[] = [];
  if (input.resolution.status === "applied") {
    parts.push(input.resolution.result.decision.intent === "grant" ? "İzni aldım." : "Tamam, bu aktiviteyi yapmayacağım.");
  }
  if (input.reply.trim()) parts.push(input.reply.trim());
  if (input.prompt) parts.push(input.prompt.text);
  return parts.join("\n\n");
}
