import type { Express, Request, Response } from "express";
import { authorizeKairaInternalWorker } from "./kairaInternalWorkerAuth";
import { buildRuntimeTestRunRecordV1 } from "./testRunRuntimeProvenance";
import { resolveChatTestRunBinding } from "./testRunLiveBinding";

const CONTRACT_VERSION = 1 as const;

type PrivatRoomDmEvent = {
  contractVersion: 1;
  source: "privatroom";
  eventType: "message.created";
  eventId: string;
  occurredAt: number;
  kairaInstanceId: string;
  conversation: {
    kind: "direct";
    conversationId: string;
    participantIds: [string, string];
  };
  actor: {
    userId: string;
    displayName: string;
    username?: string;
  };
  message: {
    messageId: string;
    text: string;
    createdAt: number;
    replyToMessageId?: string;
  };
  capabilities: string[];
};

function authorize(req: Request, res: Response): boolean {
  const decision = authorizeKairaInternalWorker({
    authorizationHeader: req.get("authorization"),
    configuredSecret: process.env.PRIVATROOM_INTEGRATION_TOKEN,
  });
  if (decision.status !== "authorized") {
    res.status(decision.httpStatus).json({ ok: false, error: decision.reason });
    return false;
  }
  return true;
}

function isEvent(value: unknown): value is PrivatRoomDmEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<PrivatRoomDmEvent>;
  return (
    event.contractVersion === CONTRACT_VERSION &&
    event.source === "privatroom" &&
    event.eventType === "message.created" &&
    typeof event.eventId === "string" && event.eventId.length > 0 &&
    typeof event.kairaInstanceId === "string" && event.kairaInstanceId.length > 0 &&
    event.conversation?.kind === "direct" &&
    typeof event.conversation?.conversationId === "string" &&
    Array.isArray(event.conversation?.participantIds) &&
    event.conversation!.participantIds.length === 2 &&
    typeof event.actor?.userId === "string" &&
    typeof event.actor?.displayName === "string" &&
    typeof event.message?.messageId === "string" &&
    typeof event.message?.text === "string" && event.message.text.trim().length > 0 &&
    typeof event.message?.createdAt === "number" &&
    Array.isArray(event.capabilities)
  );
}

const safeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 160);

export function registerPrivatRoomDmIntegrationRoute(app: Express) {
  app.post("/api/integrations/privatroom/dm", async (req: Request, res: Response) => {
    if (!authorize(req, res)) return;
    if (!isEvent(req.body)) {
      return res.status(400).json({ error: "invalid_privatroom_dm_event" });
    }

    const event = req.body;

    const incomingTestRunId = String(req.get("x-kaira-test-run-id") || "").trim();
    const incomingTestMode = String(req.get("x-kaira-test-mode") || "").trim().toLowerCase();
    const incomingEnvironmentId = String(req.get("x-kaira-environment-id") || "").trim();
    const incomingPrivatRoomCommit = String(req.get("x-privatroom-git-commit") || "").trim();
    const incomingScenarioPackVersion = String(
      req.get("x-kaira-scenario-pack-version") || "",
    ).trim();

    let testRunRecord = undefined;
    if (incomingTestRunId) {
      const conversationServerId = event.conversation.conversationId.replace(/^room:/, "");
      testRunRecord = buildRuntimeTestRunRecordV1({
        testRunId: incomingTestRunId,
        environmentId:
          incomingEnvironmentId === "test" ||
          incomingEnvironmentId === "staging" ||
          incomingEnvironmentId === "live-beta"
            ? incomingEnvironmentId
            : "live-beta",
        mode: incomingTestMode === "continuation" ? "continuation" : "fresh",
        serverId: conversationServerId,
        kairaInstanceId: event.kairaInstanceId,
        testerUserId: event.actor.userId,
        privatRoomCommit: incomingPrivatRoomCommit,
        scenarioPackVersion:
          incomingScenarioPackVersion || "social-platform-v0.4",
        trialState: "fresh",
        sourceRunId:
          incomingTestMode === "continuation"
            ? String(req.get("x-kaira-source-run-id") || "").trim()
            : undefined,
      });
    }

    if (!event.capabilities.includes("message.send")) {
      return res.json({
        contractVersion: CONTRACT_VERSION,
        sourceEventId: event.eventId,
        responseId: `no_reply_${safeId(event.eventId)}`,
        proposedActions: [],
        noReplyReason: "message_send_capability_not_granted",
      });
    }

    const legacySessionId = `privatroom_${safeId(event.conversation.conversationId)}`;
    const testRunBinding = resolveChatTestRunBinding({
      legacySessionId,
      record: testRunRecord,
    });

    const corePayload = {
      requestId: `privatroom_${safeId(event.eventId)}`,
      sessionId: testRunBinding.sessionId,
      testRunRecord: testRunBinding.record,
      userId: event.actor.userId,
      userName: event.actor.displayName,
      userMessage: event.message.text,
      kairaInstanceId: event.kairaInstanceId,
      history: [],
      provider: process.env.PRIVATROOM_KAIRA_PROVIDER || "openrouter",
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20_000);
      let coreResponse: globalThis.Response;
      try {
        coreResponse = await fetch("http://127.0.0.1:3000/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corePayload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      const data = await coreResponse.json().catch(() => ({}));
      if (!coreResponse.ok) {
        return res.status(coreResponse.status >= 500 ? 502 : 400).json({
          error: data?.error || `kaira_core_http_${coreResponse.status}`,
        });
      }

      const reply = String(data?.reply || "").trim();
      const responseTestRunId =
        typeof data?.testRunId === "string" ? data.testRunId : testRunBinding.testRunId;
      if (!reply) {
        return res.json({
          contractVersion: CONTRACT_VERSION,
          sourceEventId: event.eventId,
          responseId: `no_reply_${safeId(event.eventId)}`,
          proposedActions: [],
          noReplyReason: "kaira_core_returned_empty_reply",
        });
      }

      return res.json({
        contractVersion: CONTRACT_VERSION,
        sourceEventId: event.eventId,
        responseId: `reply_${safeId(event.eventId)}`,
        testRunId: responseTestRunId,
        proposedActions: [
          {
            type: "message.send",
            conversationId: event.conversation.conversationId,
            text: reply,
            replyToMessageId: event.message.messageId,
          },
        ],
      });
    } catch (error: any) {
      return res.status(502).json({
        error: error?.name === "AbortError"
          ? "kaira_core_timeout"
          : error?.message || "privatroom_dm_bridge_failed",
      });
    }
  });
}
