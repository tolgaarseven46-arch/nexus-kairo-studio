import { createHash } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import type {
  KairaDmMessageCreatedEventV0,
  KairaDmIntegrationResponseV0,
  KairaMessageSendActionV0,
} from '../integrations/kaira/contracts';

const stableActionMessageId = (responseId: string, index: number): string => {
  const digest = createHash('sha256').update(`${responseId}:${index}`).digest('hex').slice(0, 24);
  return `kaira_${digest}`;
};

const resolveKairaPrincipalUid = async (
  db: Firestore,
  kairaInstanceId: string,
): Promise<string | null> => {
  const snapshot = await db.collection('users')
    .where('principalType', '==', 'droit')
    .where('droitProvider', '==', 'kaira')
    .where('droitInstanceId', '==', kairaInstanceId)
    .limit(2)
    .get();
  if (snapshot.size !== 1) return null;
  return snapshot.docs[0].id;
};

const validateMessageAction = (
  event: KairaDmMessageCreatedEventV0,
  action: KairaMessageSendActionV0,
): string | null => {
  if (action.conversationId !== event.conversation.conversationId) return 'conversation_mismatch';
  if (!event.capabilities.includes('message.send')) return 'capability_not_granted';
  if (!action.text.trim()) return 'empty_message';
  return null;
};

export const applyKairaProposedActions = async (
  db: Firestore,
  event: KairaDmMessageCreatedEventV0,
  response: KairaDmIntegrationResponseV0,
): Promise<{ applied: number; skipped: Array<{ index: number; reason: string }> }> => {
  const kairaUid = await resolveKairaPrincipalUid(db, event.kairaInstanceId);
  if (!kairaUid) {
    throw new Error(`Kaira principal bulunamadı veya tekil değil: ${event.kairaInstanceId}`);
  }
  if (!event.conversation.participantIds.includes(kairaUid)) {
    throw new Error('Kaira principal kaynak konuşmanın katılımcısı değil.');
  }

  let applied = 0;
  const skipped: Array<{ index: number; reason: string }> = [];

  for (let index = 0; index < response.proposedActions.length; index += 1) {
    const action = response.proposedActions[index];
    if (action.type !== 'message.send') {
      skipped.push({ index, reason: 'unsupported_action' });
      continue;
    }

    const issue = validateMessageAction(event, action);
    if (issue) {
      skipped.push({ index, reason: issue });
      continue;
    }

    const conversationRef = db.collection('directConversations').doc(action.conversationId);
    const conversationSnap = await conversationRef.get();
    if (!conversationSnap.exists) {
      skipped.push({ index, reason: 'conversation_not_found' });
      continue;
    }

    const messageId = stableActionMessageId(response.responseId, index);
    const messageRef = conversationRef.collection('messages').doc(messageId);
    const now = Date.now();

    const wrote = await db.runTransaction(async (tx) => {
      const existing = await tx.get(messageRef);
      if (existing.exists) return false;
      tx.create(messageRef, {
        messageId,
        eventId: messageId,
        conversationId: action.conversationId,
        senderUid: kairaUid,
        kind: 'text',
        text: action.text.trim(),
        createdAt: now,
        ...(action.replyToMessageId ? { replyToMessageId: action.replyToMessageId } : {}),
        source: 'kaira_integration',
        sourceEventId: event.eventId,
        responseId: response.responseId,
      });
      tx.set(conversationRef, {
        updatedAt: now,
        lastMessageText: action.text.trim(),
        lastMessageSenderId: kairaUid,
        lastMessageAt: now,
      }, { merge: true });
      return true;
    });

    if (wrote) applied += 1;
  }

  return { applied, skipped };
};
