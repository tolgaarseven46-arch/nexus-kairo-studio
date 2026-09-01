import type { KairaActivityExecutionRecord } from "./kairaActivityExecution";
import {
  applyKairaActivityExecutionCommand,
  type KairaActivityExecutionCommandCoordinatorResult,
} from "./kairaActivityExecutionCoordinator";
import {
  createKairaActivityPermissionDialogueRequest,
  resolveKairaActivityPermissionReply,
  type KairaActivityPermissionDialogueRequest,
  type KairaActivityPermissionReplyDecision,
} from "./kairaActivityPermissionDialogue";
import {
  createKairaActivityPermissionRequestAtomic,
  settleKairaActivityPermissionRequestAtomic,
  type KairaActivityPermissionRequestCreateResult,
} from "./kairaActivityPermissionDialogueStore";

export async function openKairaActivityPermissionDialogue(input: {
  execution: KairaActivityExecutionRecord;
  sessionId: string;
  promptTurnId: string;
  now: string;
  expiresAt?: string;
}): Promise<KairaActivityPermissionRequestCreateResult> {
  const request = createKairaActivityPermissionDialogueRequest(input);
  return createKairaActivityPermissionRequestAtomic(request);
}

export type KairaActivityPermissionDialogueApplyResult =
  | {
      status: "unmatched";
      decision: Extract<KairaActivityPermissionReplyDecision, { status: "unmatched" }>;
    }
  | {
      status: "execution_rejected";
      decision: Extract<KairaActivityPermissionReplyDecision, { status: "matched" }>;
      execution: KairaActivityExecutionCommandCoordinatorResult;
    }
  | {
      status: "applied";
      decision: Extract<KairaActivityPermissionReplyDecision, { status: "matched" }>;
      execution: KairaActivityExecutionCommandCoordinatorResult;
      request: KairaActivityPermissionDialogueRequest;
    };

/**
 * Dialogue is only a correlation authority. It never edits execution state itself.
 * The canonical activity executor applies grant/deny first; only then is the
 * dialogue request settled. If request persistence fails after execution applied,
 * an exact retry replays the execution command and can safely finish settlement.
 */
export async function applyKairaActivityPermissionDialogueReply(input: {
  request: KairaActivityPermissionDialogueRequest;
  replyingUserId: string;
  sessionId: string;
  previousAssistantTurnId: string;
  message: string;
  now: string;
}): Promise<KairaActivityPermissionDialogueApplyResult> {
  const decision = resolveKairaActivityPermissionReply(input);
  if (decision.status === "unmatched") return { status: "unmatched", decision };

  const execution = await applyKairaActivityExecutionCommand({
    ownerUserId: decision.request.ownerUserId,
    kairaInstanceId: decision.request.kairaInstanceId,
    activityId: decision.request.activityId,
    command: decision.command,
    now: input.now,
  });
  if (execution.execution.status === "rejected") {
    return { status: "execution_rejected", decision, execution };
  }

  const request = await settleKairaActivityPermissionRequestAtomic({
    request: decision.request,
    intent: decision.intent,
    now: input.now,
  });
  return { status: "applied", decision, execution, request };
}
