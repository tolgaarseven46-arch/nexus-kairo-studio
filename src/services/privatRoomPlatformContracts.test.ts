import { describe, expect, it } from 'vitest';
import {
  PRIVATROOM_PLATFORM_CONTRACT_VERSION,
  isPlatformActionResultV1,
  isPlatformCapabilityGrant,
  isPlatformContextV1,
  isPrivatRoomPlatformEventV1,
  isProposedPlatformAction,
  type PlatformActorContextV1,
  type PlatformContextV1,
  type PlatformServerContextV1,
  type ProposedPlatformAction,
} from '../integrations/privatroom/platformContracts';

describe('PrivatRoom platform contract v1', () => {
  it('keeps Kaira-owned social inference and derived/stale facts out of platform context', () => {
    type HasSocialContext = 'socialContext' extends keyof PlatformContextV1 ? true : false;
    type HasKnownGroups = 'knownGroups' extends keyof PlatformContextV1 ? true : false;
    type ServerEmbedsRules = 'rules' extends keyof PlatformServerContextV1 ? true : false;
    type ActorEmbedsMembershipAge = 'membershipAgeMs' extends keyof PlatformActorContextV1 ? true : false;

    const hasSocialContext: HasSocialContext = false;
    const hasKnownGroups: HasKnownGroups = false;
    const serverEmbedsRules: ServerEmbedsRules = false;
    const actorEmbedsMembershipAge: ActorEmbedsMembershipAge = false;

    expect(hasSocialContext).toBe(false);
    expect(hasKnownGroups).toBe(false);
    expect(serverEmbedsRules).toBe(false);
    expect(actorEmbedsMembershipAge).toBe(false);
  });

  const context: PlatformContextV1 = {
    server: {
      serverId: 'server_1',
      name: 'Lise Tayfa',
      rulesVersion: 'rules_v1',
    },
    room: {
      roomId: 'room_main',
      roomType: 'text',
    },
    actor: {
      userId: 'user_1',
      displayName: 'Tolga',
      joinedAt: 1_700_000_000_000,
      roles: ['owner', 'member'],
    },
    capabilities: [
      {
        grantId: 'grant_timeout_room_main',
        capability: 'member.timeout',
        mode: 'owner_approval',
        scope: {
          serverId: 'server_1',
          roomId: 'room_main',
        },
        constraints: {
          maxTimeoutMs: 3_600_000,
          targetRolesExcluded: ['owner'],
        },
      },
    ],
  };

  it('accepts a scoped typed platform context', () => {
    expect(isPlatformContextV1(context)).toBe(true);
    expect(isPlatformCapabilityGrant(context.capabilities[0])).toBe(true);
  });

  it('rejects a capability without server scope', () => {
    expect(
      isPlatformCapabilityGrant({
        grantId: 'grant_bad',
        capability: 'member.timeout',
        mode: 'owner_approval',
        scope: {},
      }),
    ).toBe(false);
  });

  it('keeps event identity/version outside platform context', () => {
    expect(
      isPrivatRoomPlatformEventV1({
        contractVersion: PRIVATROOM_PLATFORM_CONTRACT_VERSION,
        eventId: 'evt_1',
        eventType: 'message.created',
        occurredAt: 1_700_000_100_000,
        source: 'privatroom',
        payload: { messageId: 'msg_1', text: 'selam' },
        context,
      }),
    ).toBe(true);

    expect(
      isPrivatRoomPlatformEventV1({
        contractVersion: 99,
        eventId: 'evt_1',
        eventType: 'message.created',
        occurredAt: 1_700_000_100_000,
        source: 'privatroom',
        payload: {},
        context,
      }),
    ).toBe(false);
  });

  it('requires action type and requested capability to match', () => {
    const action: ProposedPlatformAction = {
      actionId: 'action_timeout_1',
      type: 'member.timeout',
      requestedCapability: 'member.timeout',
      serverId: 'server_1',
      roomId: 'room_main',
      targetUserId: 'user_2',
      durationMs: 600_000,
      reason: 'Tekrarlanan hedefli hakaret',
      basedOnEventIds: ['evt_1', 'evt_2'],
      confidence: 0.91,
    };

    expect(isProposedPlatformAction(action)).toBe(true);
    expect(
      isProposedPlatformAction({
        ...action,
        requestedCapability: 'member.ban',
      }),
    ).toBe(false);
  });

  it('validates action results independently from proposals', () => {
    expect(
      isPlatformActionResultV1({
        contractVersion: PRIVATROOM_PLATFORM_CONTRACT_VERSION,
        actionId: 'action_timeout_1',
        status: 'approval_required',
        approvalId: 'approval_1',
      }),
    ).toBe(true);
  });
});
