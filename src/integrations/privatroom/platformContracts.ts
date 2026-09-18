export const PRIVATROOM_PLATFORM_CONTRACT_VERSION = 1 as const;

export type PlatformRole = 'owner' | 'admin' | 'moderator' | 'member';

export type PlatformCapability =
  | 'server.rules.propose'
  | 'server.rules.publish'
  | 'member.warn'
  | 'message.delete'
  | 'member.timeout'
  | 'member.kick'
  | 'member.ban';

export type PlatformCapabilityMode =
  | 'direct'
  | 'owner_approval'
  | 'propose_only';

export interface PlatformCapabilityScope {
  serverId: string;
  roomId?: string;
}

export interface PlatformCapabilityConstraints {
  maxTimeoutMs?: number;
  targetRolesExcluded?: PlatformRole[];
}

export interface PlatformCapabilityGrant {
  grantId: string;
  capability: PlatformCapability;
  mode: PlatformCapabilityMode;
  scope: PlatformCapabilityScope;
  constraints?: PlatformCapabilityConstraints;
  expiresAt?: number;
}

export interface PlatformServerContextV1 {
  serverId: string;
  name: string;
  rulesVersion: string;
}

export interface PlatformRoomContextV1 {
  roomId: string;
  roomType: 'text';
}

export interface PlatformActorContextV1 {
  userId: string;
  displayName: string;
  joinedAt: number;
  roles: PlatformRole[];
}

/**
 * Platform-owned facts only.
 *
 * Social inference, relationship meaning, group-fit hypotheses and appraisal
 * must NOT be projected into this object. Those remain Kaira-owned evidence.
 */
export interface PlatformContextV1 {
  server: PlatformServerContextV1;
  room?: PlatformRoomContextV1;
  actor: PlatformActorContextV1;
  capabilities: PlatformCapabilityGrant[];
}

export interface PrivatRoomPlatformEventV1<TPayload = unknown> {
  contractVersion: typeof PRIVATROOM_PLATFORM_CONTRACT_VERSION;
  eventId: string;
  eventType: string;
  occurredAt: number;
  source: 'privatroom';
  payload: TPayload;
  context: PlatformContextV1;
}

export type PlatformActionType =
  | 'server.rules.propose'
  | 'member.warn'
  | 'message.delete'
  | 'member.timeout'
  | 'member.kick'
  | 'member.ban';

interface ProposedPlatformActionBase {
  actionId: string;
  type: PlatformActionType;
  serverId: string;
  roomId?: string;
  requestedCapability: PlatformCapability;
  basedOnEventIds: string[];
  confidence: number;
}

export interface ServerRulesProposeAction extends ProposedPlatformActionBase {
  type: 'server.rules.propose';
  requestedCapability: 'server.rules.propose';
  rulesVersionBase: string;
  rules: Array<{
    ruleId: string;
    text: string;
  }>;
}

export interface MemberWarnAction extends ProposedPlatformActionBase {
  type: 'member.warn';
  requestedCapability: 'member.warn';
  targetUserId: string;
  reason: string;
}

export interface MessageDeleteAction extends ProposedPlatformActionBase {
  type: 'message.delete';
  requestedCapability: 'message.delete';
  messageId: string;
  reason: string;
}

export interface MemberTimeoutAction extends ProposedPlatformActionBase {
  type: 'member.timeout';
  requestedCapability: 'member.timeout';
  targetUserId: string;
  durationMs: number;
  reason: string;
}

export interface MemberKickAction extends ProposedPlatformActionBase {
  type: 'member.kick';
  requestedCapability: 'member.kick';
  targetUserId: string;
  reason: string;
}

export interface MemberBanAction extends ProposedPlatformActionBase {
  type: 'member.ban';
  requestedCapability: 'member.ban';
  targetUserId: string;
  reason: string;
}

export type ProposedPlatformAction =
  | ServerRulesProposeAction
  | MemberWarnAction
  | MessageDeleteAction
  | MemberTimeoutAction
  | MemberKickAction
  | MemberBanAction;

export type PlatformActionExecutionStatus =
  | 'executed'
  | 'approval_required'
  | 'rejected'
  | 'failed';

export interface PlatformActionResultV1 {
  contractVersion: typeof PRIVATROOM_PLATFORM_CONTRACT_VERSION;
  actionId: string;
  status: PlatformActionExecutionStatus;
  reason?: string;
  executedAt?: number;
  approvalId?: string;
}

const PLATFORM_ROLES = new Set<PlatformRole>([
  'owner',
  'admin',
  'moderator',
  'member',
]);

const CAPABILITIES = new Set<PlatformCapability>([
  'server.rules.propose',
  'server.rules.publish',
  'member.warn',
  'message.delete',
  'member.timeout',
  'member.kick',
  'member.ban',
]);

const CAPABILITY_MODES = new Set<PlatformCapabilityMode>([
  'direct',
  'owner_approval',
  'propose_only',
]);

export const isPlatformCapabilityGrant = (
  value: unknown,
): value is PlatformCapabilityGrant => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PlatformCapabilityGrant>;
  const scope = candidate.scope as Partial<PlatformCapabilityScope> | undefined;

  return (
    typeof candidate.grantId === 'string' &&
    candidate.grantId.length > 0 &&
    typeof candidate.capability === 'string' &&
    CAPABILITIES.has(candidate.capability as PlatformCapability) &&
    typeof candidate.mode === 'string' &&
    CAPABILITY_MODES.has(candidate.mode as PlatformCapabilityMode) &&
    typeof scope?.serverId === 'string' &&
    scope.serverId.length > 0 &&
    (scope.roomId === undefined || typeof scope.roomId === 'string') &&
    (candidate.expiresAt === undefined || typeof candidate.expiresAt === 'number')
  );
};

export const isPlatformContextV1 = (
  value: unknown,
): value is PlatformContextV1 => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PlatformContextV1>;
  const server = candidate.server as Partial<PlatformServerContextV1> | undefined;
  const room = candidate.room as Partial<PlatformRoomContextV1> | undefined;
  const actor = candidate.actor as Partial<PlatformActorContextV1> | undefined;

  return (
    typeof server?.serverId === 'string' &&
    server.serverId.length > 0 &&
    typeof server.name === 'string' &&
    typeof server.rulesVersion === 'string' &&
    server.rulesVersion.length > 0 &&
    (room === undefined ||
      (typeof room.roomId === 'string' &&
        room.roomId.length > 0 &&
        room.roomType === 'text')) &&
    typeof actor?.userId === 'string' &&
    actor.userId.length > 0 &&
    typeof actor.displayName === 'string' &&
    typeof actor.joinedAt === 'number' &&
    Array.isArray(actor.roles) &&
    actor.roles.every((role) => PLATFORM_ROLES.has(role as PlatformRole)) &&
    Array.isArray(candidate.capabilities) &&
    candidate.capabilities.every(isPlatformCapabilityGrant)
  );
};

export const isPrivatRoomPlatformEventV1 = (
  value: unknown,
): value is PrivatRoomPlatformEventV1 => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PrivatRoomPlatformEventV1>;

  return (
    candidate.contractVersion === PRIVATROOM_PLATFORM_CONTRACT_VERSION &&
    candidate.source === 'privatroom' &&
    typeof candidate.eventId === 'string' &&
    candidate.eventId.length > 0 &&
    typeof candidate.eventType === 'string' &&
    candidate.eventType.length > 0 &&
    typeof candidate.occurredAt === 'number' &&
    isPlatformContextV1(candidate.context)
  );
};


export const isProposedPlatformAction = (
  value: unknown,
): value is ProposedPlatformAction => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ProposedPlatformAction> & {
    type?: string;
    requestedCapability?: string;
  };

  const baseValid =
    typeof candidate.actionId === 'string' &&
    candidate.actionId.length > 0 &&
    typeof candidate.type === 'string' &&
    typeof candidate.serverId === 'string' &&
    candidate.serverId.length > 0 &&
    (candidate.roomId === undefined || typeof candidate.roomId === 'string') &&
    typeof candidate.requestedCapability === 'string' &&
    CAPABILITIES.has(candidate.requestedCapability as PlatformCapability) &&
    Array.isArray(candidate.basedOnEventIds) &&
    candidate.basedOnEventIds.every((id) => typeof id === 'string' && id.length > 0) &&
    typeof candidate.confidence === 'number' &&
    candidate.confidence >= 0 &&
    candidate.confidence <= 1;

  if (!baseValid || candidate.type !== candidate.requestedCapability) return false;

  switch (candidate.type) {
    case 'server.rules.propose': {
      const action = candidate as Partial<ServerRulesProposeAction>;
      return (
        typeof action.rulesVersionBase === 'string' &&
        action.rulesVersionBase.length > 0 &&
        Array.isArray(action.rules) &&
        action.rules.every(
          (rule) =>
            Boolean(rule) &&
            typeof rule.ruleId === 'string' &&
            rule.ruleId.length > 0 &&
            typeof rule.text === 'string' &&
            rule.text.trim().length > 0,
        )
      );
    }
    case 'member.warn': {
      const action = candidate as Partial<MemberWarnAction>;
      return (
        typeof action.targetUserId === 'string' &&
        action.targetUserId.length > 0 &&
        typeof action.reason === 'string' &&
        action.reason.trim().length > 0
      );
    }
    case 'message.delete': {
      const action = candidate as Partial<MessageDeleteAction>;
      return (
        typeof action.messageId === 'string' &&
        action.messageId.length > 0 &&
        typeof action.reason === 'string' &&
        action.reason.trim().length > 0
      );
    }
    case 'member.timeout': {
      const action = candidate as Partial<MemberTimeoutAction>;
      return (
        typeof action.targetUserId === 'string' &&
        action.targetUserId.length > 0 &&
        typeof action.durationMs === 'number' &&
        action.durationMs > 0 &&
        typeof action.reason === 'string' &&
        action.reason.trim().length > 0
      );
    }
    case 'member.kick':
    case 'member.ban': {
      const action = candidate as Partial<MemberKickAction | MemberBanAction>;
      return (
        typeof action.targetUserId === 'string' &&
        action.targetUserId.length > 0 &&
        typeof action.reason === 'string' &&
        action.reason.trim().length > 0
      );
    }
    default:
      return false;
  }
};

export const isPlatformActionResultV1 = (
  value: unknown,
): value is PlatformActionResultV1 => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PlatformActionResultV1>;
  return (
    candidate.contractVersion === PRIVATROOM_PLATFORM_CONTRACT_VERSION &&
    typeof candidate.actionId === 'string' &&
    candidate.actionId.length > 0 &&
    (candidate.status === 'executed' ||
      candidate.status === 'approval_required' ||
      candidate.status === 'rejected' ||
      candidate.status === 'failed') &&
    (candidate.reason === undefined || typeof candidate.reason === 'string') &&
    (candidate.executedAt === undefined || typeof candidate.executedAt === 'number') &&
    (candidate.approvalId === undefined || typeof candidate.approvalId === 'string')
  );
};


export interface PlatformActionFeasibilityRequestV1 {
  contractVersion: typeof PRIVATROOM_PLATFORM_CONTRACT_VERSION;
  requestId: string;
  intentId: string;
  requestedCapability: PlatformCapability;
  serverId: string;
  roomId?: string;
  targetUserId?: string;
  requestedAt: number;
}

export type PlatformActionFeasibilityStatus =
  | 'allowed'
  | 'approval_required'
  | 'propose_only'
  | 'denied';

export interface PlatformActionFeasibilityResultV1 {
  contractVersion: typeof PRIVATROOM_PLATFORM_CONTRACT_VERSION;
  requestId: string;
  intentId: string;
  requestedCapability: PlatformCapability;
  status: PlatformActionFeasibilityStatus;
  matchedGrantId?: string;
  mode?: PlatformCapabilityMode;
  constraints?: PlatformCapabilityConstraints;
  checkedAt: number;
  reason?: string;
}

export const isPlatformActionFeasibilityRequestV1 = (
  value: unknown,
): value is PlatformActionFeasibilityRequestV1 => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PlatformActionFeasibilityRequestV1>;
  return (
    candidate.contractVersion === PRIVATROOM_PLATFORM_CONTRACT_VERSION &&
    typeof candidate.requestId === 'string' &&
    candidate.requestId.length > 0 &&
    typeof candidate.intentId === 'string' &&
    candidate.intentId.length > 0 &&
    typeof candidate.requestedCapability === 'string' &&
    CAPABILITIES.has(candidate.requestedCapability as PlatformCapability) &&
    typeof candidate.serverId === 'string' &&
    candidate.serverId.length > 0 &&
    (candidate.roomId === undefined || typeof candidate.roomId === 'string') &&
    (candidate.targetUserId === undefined || typeof candidate.targetUserId === 'string') &&
    typeof candidate.requestedAt === 'number'
  );
};

export const isPlatformActionFeasibilityResultV1 = (
  value: unknown,
): value is PlatformActionFeasibilityResultV1 => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<PlatformActionFeasibilityResultV1>;
  return (
    candidate.contractVersion === PRIVATROOM_PLATFORM_CONTRACT_VERSION &&
    typeof candidate.requestId === 'string' &&
    candidate.requestId.length > 0 &&
    typeof candidate.intentId === 'string' &&
    candidate.intentId.length > 0 &&
    typeof candidate.requestedCapability === 'string' &&
    CAPABILITIES.has(candidate.requestedCapability as PlatformCapability) &&
    (candidate.status === 'allowed' ||
      candidate.status === 'approval_required' ||
      candidate.status === 'propose_only' ||
      candidate.status === 'denied') &&
    (candidate.matchedGrantId === undefined || typeof candidate.matchedGrantId === 'string') &&
    (candidate.mode === undefined ||
      CAPABILITY_MODES.has(candidate.mode as PlatformCapabilityMode)) &&
    typeof candidate.checkedAt === 'number' &&
    (candidate.reason === undefined || typeof candidate.reason === 'string')
  );
};
