import type { Firestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';
import { KAIRA_ROOM_PARTICIPANT_UID } from './kairaInviteContract';

export type PrivatRoomLifecycleEventType =
  | 'room.created'
  | 'participant.joined'
  | 'kaira.invited_to_server';

export interface KairaLifecycleWelcomeInput {
  eventType: PrivatRoomLifecycleEventType;
  roomId: string;
  roomName: string;
  actorUserId: string;
  actorDisplayName: string;
  actorUsername?: string;
  isOwner: boolean;
  inviteRequestId?: string;
  inviterRole?: 'owner' | 'admin';
}

export interface KairaLifecycleWelcomeResult {
  text: string;
  testRunId?: string;
  variantId?: string;
  realizationVariantSeed?: string;
}

const safeId = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 160);

export async function requestKairaLifecycleWelcome(
  input: KairaLifecycleWelcomeInput,
): Promise<KairaLifecycleWelcomeResult> {
  const base = process.env.KAIRA_API_URL?.trim();
  const token = process.env.KAIRA_INTEGRATION_TOKEN?.trim();
  const instanceId = process.env.KAIRA_DEFAULT_INSTANCE_ID?.trim();
  const privatRoomCommit =
    process.env.RENDER_GIT_COMMIT?.trim() ||
    process.env.PRIVATROOM_GIT_COMMIT?.trim() ||
    '';

  if (!base || !token || !instanceId || !privatRoomCommit) {
    throw new Error('kaira_lifecycle_integration_not_configured');
  }

  const occurredAt = Date.now();
  const eventKey =
    input.eventType === 'kaira.invited_to_server' && input.inviteRequestId
      ? `${input.eventType}:${input.roomId}:${input.actorUserId}:${input.inviteRequestId}`
      : `${input.eventType}:${input.roomId}:${input.actorUserId}:${occurredAt}`;
  const eventId = `lifecycle_${createHash('sha256')
    .update(eventKey)
    .digest('hex')
    .slice(0, 24)}`;
  const testRunId = `TR_live_beta_${safeId(input.roomId)}`;

  const response = await fetch(
    `${base.replace(/\/$/, '')}/api/integrations/privatroom/lifecycle`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Kaira-Test-Mode': 'test',
        'X-Kaira-Test-Run-Id': testRunId,
        'X-Kaira-Environment-Id': 'live-beta',
        'X-PrivatRoom-Git-Commit': privatRoomCommit,
        'X-Kaira-Scenario-Pack-Version': 'social-platform-v0.4',
      },
      body: JSON.stringify({
        contractVersion: 1,
        source: 'privatroom',
        eventType: input.eventType,
        eventId,
        occurredAt,
        kairaInstanceId: instanceId,
        room: {
          roomId: input.roomId,
          roomName: input.roomName,
        },
        actor: {
          userId: input.actorUserId,
          displayName: input.actorDisplayName,
          username: input.actorUsername,
          isOwner: input.isOwner,
        },
        capabilities: ['message.send'],
        ...(input.inviteRequestId ? { inviteRequestId: input.inviteRequestId } : {}),
        ...(input.inviterRole ? { inviterRole: input.inviterRole } : {}),
      }),
    },
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error || `kaira_lifecycle_http_${response.status}`);
  }

  const action = Array.isArray(payload?.proposedActions)
    ? payload.proposedActions.find(
        (candidate: any) =>
          candidate?.type === 'message.send' &&
          typeof candidate?.text === 'string' &&
          candidate.text.trim(),
      )
    : null;

  if (!action) {
    throw new Error('kaira_lifecycle_missing_message_action');
  }

  return {
    text: action.text.trim(),
    testRunId: typeof payload?.testRunId === 'string' ? payload.testRunId : undefined,
    variantId:
      typeof payload?.welcome?.variantId === 'string'
        ? payload.welcome.variantId
        : undefined,
    realizationVariantSeed:
      typeof payload?.welcome?.realizationVariantSeed === 'string'
        ? payload.welcome.realizationVariantSeed
        : undefined,
  };
}


export const buildKairaRoomParticipant = (joinedAt = new Date().toISOString()) => ({
  uid: KAIRA_ROOM_PARTICIPANT_UID,
  displayName: 'Kaira',
  username: 'kaira',
  avatarUrl:
    'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Kaira&backgroundColor=5865f2',
  roleColor: '#7c5cff',
  roleIcon: '◆',
  roleName: 'Sunucu Yöneticisi',
  isHost: false,
  joinedAt,
});

export function buildKairaLifecycleMessage(
  messageId: string,
  welcome: KairaLifecycleWelcomeResult,
  now = Date.now(),
) {
  return {
    id: messageId,
    senderUid: KAIRA_ROOM_PARTICIPANT_UID,
    senderName: 'Kaira',
    senderUsername: 'kaira',
    senderAvatar:
      'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Kaira&backgroundColor=5865f2',
    content: welcome.text,
    timestamp: new Date(now).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    roleColor: '#7c5cff',
    roleIcon: '◆',
    roleName: 'Sunucu Yöneticisi',
    messageSource:
      welcome.variantId?.startsWith('kaira_invited_')
        ? 'kaira_invite_introduction'
        : 'kaira_canonical_welcome',
    testRunId: welcome.testRunId || null,
    realizationVariantId: welcome.variantId || null,
    realizationVariantSeed: welcome.realizationVariantSeed || null,
    createdAtServer: new Date(now),
  };
}

export async function persistCanonicalKairaLifecycleWelcome(
  db: Firestore,
  input: {
    eventType: PrivatRoomLifecycleEventType;
    roomId: string;
    actorUserId: string;
  },
) {
  const roomRef = db.collection('rooms').doc(input.roomId);
  const snap = await roomRef.get();
  if (!snap.exists) throw new Error('room_not_found');

  const room = snap.data() as any;
  const participants = Array.isArray(room?.participants) ? room.participants : [];
  const actor = participants.find((p: any) => p?.uid === input.actorUserId);
  if (!actor) throw new Error('lifecycle_actor_not_in_room');

  const actorDisplayName =
    String(actor.displayName || actor.username || '').trim() || 'Oyuncu';

  const welcome = await requestKairaLifecycleWelcome({
    eventType: input.eventType,
    roomId: input.roomId,
    roomName: String(room?.roomName || 'Oda'),
    actorUserId: String(actor.uid),
    actorDisplayName,
    actorUsername: String(actor.username || '').trim() || undefined,
    isOwner: String(room?.creatorUid || '') === String(actor.uid) || actor.isHost === true,
  });

  const messageRef = roomRef.collection('messages').doc();
  const message = buildKairaLifecycleMessage(messageRef.id, welcome);

  await messageRef.set(message);
  return { message, welcome };
}
