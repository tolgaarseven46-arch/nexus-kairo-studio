import type { Firestore } from 'firebase-admin/firestore';
import type { PrivatRoomRoomContext } from '../integrations/kaira/contracts';

const asMillis = (value: unknown): number => {
  if (value && typeof value === 'object' && typeof (value as any).toMillis === 'function') {
    return Number((value as any).toMillis()) || 0;
  }
  if (value instanceof Date) return value.getTime();
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export async function loadKairaRoomConversationContext(input: {
  db: Firestore;
  roomId: string;
  actorUserId: string;
  currentMessageText: string;
  currentMessageCreatedAt: number;
}): Promise<PrivatRoomRoomContext | undefined> {
  const roomRef = input.db.collection('rooms').doc(input.roomId);
  try {
    const roomPromise = roomRef.get();
    const messagesPromise = roomRef
      .collection('messages')
      .orderBy('createdAtServer', 'desc')
      .limit(16)
      .get()
      .catch(() => roomRef.collection('messages').limit(20).get());

    const [roomSnap, messagesSnap] = await Promise.all([roomPromise, messagesPromise]);
    if (!roomSnap.exists) return undefined;

    const room = roomSnap.data() as any;
    const rows = messagesSnap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
      .sort((a, b) => asMillis(a.createdAtServer) - asMillis(b.createdAtServer));

    let skippedCurrentEcho = false;
    const recentHistory = rows
      .filter((row) => {
        const senderUid = String(row.senderUid || '');
        const isKaira =
          row.messageSource === 'kaira_canonical_welcome' ||
          row.messageSource === 'kaira_invite_introduction' ||
          row.source === 'kaira_integration' ||
          senderUid.startsWith('droit_kaira_');
        const isActor = senderUid === input.actorUserId;

        if (
          !skippedCurrentEcho &&
          isActor &&
          String(row.content || '').trim() === input.currentMessageText.trim() &&
          Math.abs(asMillis(row.createdAtServer) - input.currentMessageCreatedAt) <= 15_000
        ) {
          skippedCurrentEcho = true;
          return false;
        }
        return true;
      })
      .slice(-10)
      .map((row) => {
        const senderUid = String(row.senderUid || '');
        const isKaira =
          row.messageSource === 'kaira_canonical_welcome' ||
          row.source === 'kaira_integration' ||
          senderUid.startsWith('droit_kaira_');
        return {
          sender: isKaira ? ('droit' as const) : ('user' as const),
          text: String(row.content || '').trim(),
          participantName: String(row.senderName || row.senderUsername || '').trim() || undefined,
          isWelcome:
            row.messageSource === 'kaira_canonical_welcome' ||
            row.messageSource === 'kaira_invite_introduction',
          participantId: senderUid || undefined,
          eventId: String(row.id || '').trim() || undefined,
          occurredAt: asMillis(row.createdAtServer),
          actorKind: isKaira ? ('droit' as const) : ('human' as const),
        };
      })
      .filter((turn) => Boolean(turn.text));

    const participants = Array.isArray(room?.participants)
      ? room.participants
          .map((participant: any) => {
            const participantId = String(participant?.uid || '').trim();
            if (!participantId) return null;
            const isKaira =
              participantId.startsWith('droit_kaira_') ||
              String(participant?.username || '').trim().toLowerCase() === 'kaira';
            return {
              participantId,
              actorKind: isKaira ? ('droit' as const) : ('human' as const),
              platformRoles: participant?.isHost
                ? (['owner'] as const)
                : (['member'] as const),
            };
          })
          .filter(Boolean)
      : undefined;

    return {
      roomId: input.roomId,
      roomName: String(room?.roomName || '').trim() || undefined,
      actorIsOwner:
        String(room?.creatorUid || '') === input.actorUserId ||
        Boolean(
          Array.isArray(room?.participants) &&
            room.participants.some(
              (participant: any) =>
                String(participant?.uid || '') === input.actorUserId &&
                participant?.isHost === true,
            ),
        ),
      participants: participants as PrivatRoomRoomContext['participants'],
      recentHistory,
    };
  } catch (error) {
    console.warn('[Kaira Beta Room] authoritative room context unavailable:', error);
    return undefined;
  }
}
