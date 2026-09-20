export const KAIRA_DM_CONTRACT_VERSION = 1 as const;

export type KairaIntegrationCapability = string;

export interface PrivatRoomActorRef {
  userId: string;
  displayName: string;
  username?: string;
}

export interface PrivatRoomRecentHistoryTurn {
  sender: 'user' | 'droit';
  text: string;
  participantName?: string;
  isWelcome?: boolean;
  participantId?: string;
  eventId?: string;
  occurredAt?: number;
  actorKind?: 'human' | 'droit' | 'system';
}

export interface PrivatRoomRoomContext {
  roomId?: string;
  roomName?: string;
  actorIsOwner?: boolean;
  participants?: Array<{
    participantId: string;
    actorKind: 'human' | 'droit' | 'system';
    platformRoles?: Array<'owner' | 'admin' | 'moderator' | 'member'>;
  }>;
  recentHistory?: PrivatRoomRecentHistoryTurn[];
}

export interface PrivatRoomConversationRef {
  kind: 'direct' | 'room';
  conversationId: string;
  participantIds: string[];
  roomContext?: PrivatRoomRoomContext;
}

export interface PrivatRoomMessageCreatedPayload {
  messageId: string;
  text: string;
  createdAt: number;
  replyToMessageId?: string;
}

export interface KairaDmMessageCreatedEventV0 {
  contractVersion: typeof KAIRA_DM_CONTRACT_VERSION;
  source: 'privatroom';
  eventType: 'message.created';
  eventId: string;
  occurredAt: number;
  kairaInstanceId: string;
  conversation: PrivatRoomConversationRef;
  actor: PrivatRoomActorRef;
  message: PrivatRoomMessageCreatedPayload;
  capabilities: KairaIntegrationCapability[];
}

export interface KairaMessageSendActionV0 {
  type: 'message.send';
  conversationId: string;
  text: string;
  replyToMessageId?: string;
}

export type KairaProposedActionV0 = KairaMessageSendActionV0;

export interface KairaDmIntegrationResponseV0 {
  contractVersion: typeof KAIRA_DM_CONTRACT_VERSION;
  sourceEventId: string;
  responseId: string;
  proposedActions: KairaProposedActionV0[];
  noReplyReason?: string;
  conversationGraphObservationProof?: unknown;
}

export const buildKairaDmMessageCreatedEventV0 = (input: {
  eventId: string;
  occurredAt: number;
  kairaInstanceId: string;
  conversationId: string;
  conversationKind?: 'direct' | 'room';
  roomContext?: PrivatRoomRoomContext;
  participantIds: string[];
  actor: PrivatRoomActorRef;
  message: PrivatRoomMessageCreatedPayload;
  capabilities?: KairaIntegrationCapability[];
}): KairaDmMessageCreatedEventV0 => ({
  contractVersion: KAIRA_DM_CONTRACT_VERSION,
  source: 'privatroom',
  eventType: 'message.created',
  eventId: input.eventId,
  occurredAt: input.occurredAt,
  kairaInstanceId: input.kairaInstanceId,
  conversation: {
    kind: input.conversationKind || 'direct',
    conversationId: input.conversationId,
    participantIds: input.participantIds,
    ...(input.roomContext ? { roomContext: input.roomContext } : {}),
  },
  actor: input.actor,
  message: input.message,
  capabilities: [...(input.capabilities || [])],
});

export const isKairaDmMessageCreatedEventV0 = (
  value: unknown
): value is KairaDmMessageCreatedEventV0 => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<KairaDmMessageCreatedEventV0>;
  const conversation = candidate.conversation as Partial<PrivatRoomConversationRef> | undefined;
  const actor = candidate.actor as Partial<PrivatRoomActorRef> | undefined;
  const message = candidate.message as Partial<PrivatRoomMessageCreatedPayload> | undefined;
  return (
    candidate.contractVersion === KAIRA_DM_CONTRACT_VERSION &&
    candidate.source === 'privatroom' &&
    candidate.eventType === 'message.created' &&
    typeof candidate.eventId === 'string' && candidate.eventId.length > 0 &&
    typeof candidate.occurredAt === 'number' &&
    typeof candidate.kairaInstanceId === 'string' && candidate.kairaInstanceId.length > 0 &&
    (conversation?.kind === 'direct' || conversation?.kind === 'room') &&
    typeof conversation.conversationId === 'string' &&
    Array.isArray(conversation.participantIds) && conversation.participantIds.length >= 2 &&
    typeof actor?.userId === 'string' &&
    typeof actor?.displayName === 'string' &&
    typeof message?.messageId === 'string' &&
    typeof message?.text === 'string' &&
    typeof message?.createdAt === 'number' &&
    Array.isArray(candidate.capabilities)
  );
};

export const isKairaDmIntegrationResponseV0 = (
  value: unknown
): value is KairaDmIntegrationResponseV0 => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<KairaDmIntegrationResponseV0>;
  return (
    candidate.contractVersion === KAIRA_DM_CONTRACT_VERSION &&
    typeof candidate.sourceEventId === 'string' &&
    typeof candidate.responseId === 'string' &&
    Array.isArray(candidate.proposedActions)
  );
};
