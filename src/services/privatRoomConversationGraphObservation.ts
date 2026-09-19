import {
  buildConversationGraphV1,
  type ConversationGraphV1,
  type ConversationActorKind,
  type PlatformRole,
  type RawConversationGraphEventV1,
  type RawConversationParticipantV1,
} from "./sliceBConversationGraphRuntime";
import type { TestEnvironmentId } from "./testRunProvenance";

export interface PrivatRoomGraphHistoryTurn {
  sender: "user" | "droit";
  text: string;
  participantName?: string;
  isWelcome?: boolean;
  participantId?: string;
  eventId?: string;
  occurredAt?: number;
  actorKind?: ConversationActorKind;
}

export interface PrivatRoomGraphEventInput {
  eventId: string;
  occurredAt: number;
  kairaInstanceId: string;
  conversation: {
    kind: "direct" | "room";
    conversationId: string;
    participantIds: string[];
    roomContext?: {
      roomId?: string;
      roomName?: string;
      actorIsOwner?: boolean;
      participants?: Array<{
        participantId: string;
        actorKind: ConversationActorKind;
        platformRoles?: PlatformRole[];
      }>;
      recentHistory?: PrivatRoomGraphHistoryTurn[];
    };
  };
  actor: {
    userId: string;
    displayName: string;
  };
  message: {
    messageId: string;
    text: string;
    createdAt: number;
    replyToMessageId?: string;
  };
}

const roomIdFrom = (event: PrivatRoomGraphEventInput): string =>
  event.conversation.roomContext?.roomId ||
  event.conversation.conversationId.replace(/^room:/, "");

const platformRolesFor = (
  participantId: string,
  event: PrivatRoomGraphEventInput,
): PlatformRole[] =>
  participantId === event.actor.userId &&
  event.conversation.roomContext?.actorIsOwner === true
    ? ["owner"]
    : [];

export function buildPrivatRoomConversationGraphObservation(input: {
  event: PrivatRoomGraphEventInput;
  environmentId: TestEnvironmentId;
  testRunId?: string;
}): ConversationGraphV1 {
  const { event } = input;
  const rawEvents: RawConversationGraphEventV1[] = [];
  const participantFacts = new Map<string, RawConversationParticipantV1>();
  const identityFacts: Record<string, ConversationActorKind> = {};

  const roster = Array.isArray(event.conversation.roomContext?.participants)
    ? event.conversation.roomContext?.participants || []
    : [];
  for (const participant of roster) {
    if (
      !participant.participantId ||
      (participant.actorKind !== "human" &&
        participant.actorKind !== "droit" &&
        participant.actorKind !== "system")
    ) {
      continue;
    }
    identityFacts[participant.participantId] = participant.actorKind;
    participantFacts.set(participant.participantId, {
      participantId: participant.participantId,
      actorKind: participant.actorKind,
      platformRoles: [...(participant.platformRoles || [])],
    });
  }

  const history = Array.isArray(event.conversation.roomContext?.recentHistory)
    ? event.conversation.roomContext?.recentHistory || []
    : [];

  for (const turn of history) {
    if (
      !turn.participantId ||
      !turn.eventId ||
      typeof turn.occurredAt !== "number" ||
      (turn.actorKind !== "human" &&
        turn.actorKind !== "droit" &&
        turn.actorKind !== "system")
    ) {
      continue;
    }

    rawEvents.push({
      eventId: turn.eventId,
      actorId: turn.participantId,
      actorKind: turn.actorKind,
      occurredAt: turn.occurredAt,
    });
    identityFacts[turn.participantId] = turn.actorKind;
    if (!participantFacts.has(turn.participantId)) {
      participantFacts.set(turn.participantId, {
        participantId: turn.participantId,
        actorKind: turn.actorKind,
        platformRoles: platformRolesFor(turn.participantId, event),
      });
    }
  }

  rawEvents.push({
    eventId: event.message.messageId,
    actorId: event.actor.userId,
    actorKind: "human",
    occurredAt: event.message.createdAt,
    explicitReplyToEventId: event.message.replyToMessageId,
  });
  identityFacts[event.actor.userId] = "human";
  participantFacts.set(event.actor.userId, {
    participantId: event.actor.userId,
    actorKind: "human",
    platformRoles: platformRolesFor(event.actor.userId, event),
  });

  return buildConversationGraphV1({
    namespace: {
      environmentId: input.environmentId,
      ...(input.testRunId ? { testRunId: input.testRunId } : {}),
      serverId: roomIdFrom(event),
      roomId: roomIdFrom(event),
      kairaInstanceId: event.kairaInstanceId,
    },
    conversationId: event.conversation.conversationId,
    participants: [...participantFacts.values()],
    events: rawEvents,
    inferredAddressCandidateEdges: [],
    suppressionReceipts: [],
    escalationEvidenceRefs: [],
    decisionOwnerRegistry: {
      version: "decision-owners@1",
      owners: {},
    },
    ownedEvidenceStore: {},
    platformIdentityFacts: identityFacts,
  });
}
