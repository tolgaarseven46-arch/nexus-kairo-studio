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
