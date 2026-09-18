import type { Express, Request, Response } from "express";
import { authorizeKairaInternalWorker } from "./kairaInternalWorkerAuth";
import { buildRuntimeTestRunRecordV1 } from "./testRunRuntimeProvenance";
import { resolveChatTestRunBinding } from "./testRunLiveBinding";
import { saveTestSessionTurn } from "./kdmPersistenceService";
import { decideKairaWelcome } from "./kairaWelcomeDecision";
import { realizeKairaWelcome } from "./kairaWelcomeRealizer";

const CONTRACT_VERSION = 1 as const;

type PrivatRoomLifecycleEvent = {
  contractVersion: 1;
  source: "privatroom";
  eventType: "room.created" | "participant.joined";
  eventId: string;
  occurredAt: number;
  kairaInstanceId: string;
  room: {
    roomId: string;
    roomName: string;
  };
  actor: {
    userId: string;
    displayName: string;
    username?: string;
    isOwner: boolean;
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

const isEvent = (value: unknown): value is PrivatRoomLifecycleEvent => {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<PrivatRoomLifecycleEvent>;
  return (
    event.contractVersion === CONTRACT_VERSION &&
    event.source === "privatroom" &&
    (event.eventType === "room.created" || event.eventType === "participant.joined") &&
    typeof event.eventId === "string" &&
    event.eventId.length > 0 &&
    typeof event.occurredAt === "number" &&
    typeof event.kairaInstanceId === "string" &&
    event.kairaInstanceId.length > 0 &&
    typeof event.room?.roomId === "string" &&
    event.room.roomId.length > 0 &&
    typeof event.room?.roomName === "string" &&
    typeof event.actor?.userId === "string" &&
    event.actor.userId.length > 0 &&
    typeof event.actor?.displayName === "string" &&
    typeof event.actor?.isOwner === "boolean" &&
    Array.isArray(event.capabilities)
  );
};

const safeId = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 160);

export function registerPrivatRoomLifecycleIntegrationRoute(app: Express) {
  app.post(
    "/api/integrations/privatroom/lifecycle",
    async (req: Request, res: Response) => {
      if (!authorize(req, res)) return;
      if (!isEvent(req.body)) {
        return res.status(400).json({ error: "invalid_privatroom_lifecycle_event" });
      }

      const event = req.body;
      if (!event.capabilities.includes("message.send")) {
        return res.json({
          contractVersion: CONTRACT_VERSION,
          sourceEventId: event.eventId,
          proposedActions: [],
          noReplyReason: "message_send_capability_not_granted",
        });
      }

      const incomingTestRunId = String(
        req.get("x-kaira-test-run-id") || "",
      ).trim();
      const incomingEnvironmentId = String(
        req.get("x-kaira-environment-id") || "",
      ).trim();
      const incomingPrivatRoomCommit = String(
        req.get("x-privatroom-git-commit") || "",
      ).trim();

      const testRunRecord = incomingTestRunId
        ? buildRuntimeTestRunRecordV1({
            testRunId: incomingTestRunId,
            environmentId:
              incomingEnvironmentId === "test" ||
              incomingEnvironmentId === "staging" ||
              incomingEnvironmentId === "live-beta"
                ? incomingEnvironmentId
                : "live-beta",
            mode: "fresh",
            serverId: event.room.roomId,
            kairaInstanceId: event.kairaInstanceId,
            testerUserId: event.actor.userId,
            privatRoomCommit: incomingPrivatRoomCommit,
            scenarioPackVersion: "social-platform-v0.4",
            integrationContractVersion: "privatroom-lifecycle-v1",
            trialState: "fresh",
          })
        : undefined;

      const legacySessionId = `privatroom_${safeId(event.room.roomId)}`;
      const testRunBinding = resolveChatTestRunBinding({
        legacySessionId,
        record: testRunRecord,
      });

      const decision = decideKairaWelcome({
        eventType: event.eventType,
        actorDisplayName: event.actor.displayName,
        roomName: event.room.roomName,
        isOwner: event.actor.isOwner,
      });
      const realization = realizeKairaWelcome({
        eventId: event.eventId,
        kairaInstanceId: event.kairaInstanceId,
        actorDisplayName: event.actor.displayName,
        roomName: event.room.roomName,
        decision,
      });

      await saveTestSessionTurn({
        sessionId: testRunBinding.sessionId,
        testRunId: testRunBinding.testRunId,
        testRunRecord: testRunBinding.record,
        userId: event.actor.userId,
        userName: event.actor.displayName,
        userMessage: `[platform:${event.eventType}]`,
        assistantReply: realization.text,
        speaker: event.actor.displayName,
        intent: "platform_welcome",
        detectedEmotion: "nötr",
        retrievedMemories: [],
        metadata: {
          providerUsed: "deterministic_welcome_realizer",
          testRunId: testRunBinding.testRunId,
          testRunRecord: testRunBinding.record,
          platformEvent: {
            eventId: event.eventId,
            eventType: event.eventType,
            roomId: event.room.roomId,
            roomName: event.room.roomName,
            actorIsOwner: event.actor.isOwner,
          },
          welcomeDecision: decision,
          realizationVariantSeed: realization.realizationVariantSeed,
          realizationVariantId: realization.variantId,
        },
      });

      return res.json({
        contractVersion: CONTRACT_VERSION,
        sourceEventId: event.eventId,
        testRunId: testRunBinding.testRunId,
        welcome: {
          decision,
          variantId: realization.variantId,
          realizationVariantSeed: realization.realizationVariantSeed,
        },
        proposedActions: [
          {
            type: "message.send",
            conversationId: `room:${event.room.roomId}`,
            text: realization.text,
          },
        ],
      });
    },
  );
}
