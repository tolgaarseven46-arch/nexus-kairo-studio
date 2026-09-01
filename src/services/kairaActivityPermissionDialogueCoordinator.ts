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
import {
  clearKairaActivityPermissionSessionPointerAtomic,
  createKairaActivityPermissionSessionPointerAtomic,
  loadActiveKairaActivityPermissionSessionPointer,
} from "./kairaActivityPermissionSessionPointerStore";
import type { KairaActivityPermissionSessionPointer } from "./kairaActivityPermissionSessionPointer";

export interface KairaActivityPermissionDialogueOpenResult {
  request: KairaActivityPermissionRequestCreateResult;
  pointer: {
    status: "created" | "existing";
    pointer: KairaActivityPermissionSessionPointer;
  };
}

export async function openKairaActivityPermissionDialogue(input: {
  execution: KairaActivityExecutionRecord;
  sessionId: string;
  promptTurnId: string;
  now: string;
  expiresAt?: string;
}): Promise<KairaActivityPermissionDialogueOpenResult> {
  const request = createKairaActivityPermissionDialogueRequest(input);
  const requestResult = await createKairaActivityPermissionRequestAtomic(request);
  const pointer = await createKairaActivityPermissionSessionPointerAtomic(requestResult.request);
  return { request: requestResult, pointer };
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
 * dialogue request settled. If request/pointer persistence fails after execution
 * applied, an exact retry replays the executor command and safely finishes the
 * remaining projections.
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
  const pointer = await loadActiveKairaActivityPermissionSessionPointer({
    ownerUserId: decision.request.ownerUserId,
    kairaInstanceId: decision.request.kairaInstanceId,
    sessionId: decision.request.sessionId,
  });
  if (pointer && pointer.request.requestId === decision.request.requestId) {
    await clearKairaActivityPermissionSessionPointerAtomic({ pointer, now: input.now });
  }
  return { status: "applied", decision, execution, request };
}
