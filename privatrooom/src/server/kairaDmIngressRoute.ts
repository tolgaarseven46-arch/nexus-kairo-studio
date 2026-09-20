import type { Express, Request, Response } from 'express';
import { getPrivatRoomAdminAuth, getPrivatRoomAdminDb } from './firebaseAdmin';
import { buildKairaDmMessageCreatedEventV0 } from '../integrations/kaira/contracts';
import { enqueueKairaOutboxEvent } from './kairaOutboxStore';
import { dispatchKairaOutboxEvent } from './kairaGateway';

const bearerToken = (req: Request): string | null => {
  const raw = req.header('authorization')?.trim();
  if (!raw?.toLowerCase().startsWith('bearer ')) return null;
  return raw.slice(7).trim() || null;
};

export const registerKairaDmIngressRoute = (app: Express): void => {
  app.post('/api/integrations/kaira/dm-message', async (req: Request, res: Response) => {
    const adminAuth = getPrivatRoomAdminAuth();
    const db = getPrivatRoomAdminDb();
    if (!adminAuth || !db) {
      return res.status(503).json({ ok: false, error: 'firebase_admin_not_ready' });
    }

    const token = bearerToken(req);
    if (!token) return res.status(401).json({ ok: false, error: 'missing_bearer_token' });

    let callerUid: string;
    try {
      callerUid = (await adminAuth.verifyIdToken(token)).uid;
    } catch {
      return res.status(401).json({ ok: false, error: 'invalid_bearer_token' });
    }

    const conversationId = String(req.body?.conversationId || '').trim();
    const messageId = String(req.body?.messageId || '').trim();
    if (!conversationId || !messageId) {
      return res.status(400).json({ ok: false, error: 'conversationId_and_messageId_required' });
    }

    try {
      const conversationRef = db.collection('directConversations').doc(conversationId);
      const messageRef = conversationRef.collection('messages').doc(messageId);
      const [conversationSnap, messageSnap] = await Promise.all([
        conversationRef.get(),
        messageRef.get(),
      ]);
      if (!conversationSnap.exists || !messageSnap.exists) {
        return res.status(404).json({ ok: false, error: 'conversation_or_message_not_found' });
      }

      const conversation = conversationSnap.data() as {
        participantIds?: string[];
      };
      const message = messageSnap.data() as {
        eventId?: string;
        senderUid?: string;
        text?: string;
        createdAt?: number;
        replyToMessageId?: string;
        deletedAt?: number;
      };
      const participantIds = Array.isArray(conversation.participantIds)
        ? conversation.participantIds.filter((value): value is string => typeof value === 'string')
        : [];
      if (participantIds.length !== 2 || !participantIds.includes(callerUid)) {
        return res.status(403).json({ ok: false, error: 'caller_not_conversation_participant' });
      }
      if (message.senderUid !== callerUid) {
        return res.status(403).json({ ok: false, error: 'caller_not_message_sender' });
      }
      if (message.deletedAt || !message.text?.trim() || typeof message.createdAt !== 'number') {
        return res.status(409).json({ ok: false, error: 'message_not_dispatchable' });
      }

      const otherUid = participantIds.find((uid) => uid !== callerUid)!;
      const [actorSnap, otherSnap] = await Promise.all([
        db.collection('users').doc(callerUid).get(),
        db.collection('users').doc(otherUid).get(),
      ]);
      const actor = actorSnap.data() as { displayName?: string; username?: string } | undefined;
      const other = otherSnap.data() as {
        principalType?: string;
        droitInstanceId?: string;
        droitProvider?: string;
      } | undefined;

      if (other?.principalType !== 'droit' || other.droitProvider !== 'kaira' || !other.droitInstanceId) {
        return res.status(202).json({ ok: true, ignored: true, reason: 'conversation_has_no_kaira_droit' });
      }

      const eventId = String(message.eventId || messageId);
      const event = buildKairaDmMessageCreatedEventV0({
        eventId,
        occurredAt: message.createdAt,
        kairaInstanceId: other.droitInstanceId,
        conversationId,
        participantIds: [participantIds[0], participantIds[1]],
        actor: {
          userId: callerUid,
          displayName: actor?.displayName || actor?.username || 'Kullanıcı',
          ...(actor?.username ? { username: actor.username } : {}),
        },
        message: {
          messageId,
          text: message.text,
          createdAt: message.createdAt,
          ...(message.replyToMessageId ? { replyToMessageId: message.replyToMessageId } : {}),
        },
        capabilities: ['message.send'],
      });

      await enqueueKairaOutboxEvent(db, event);
      const dispatch = await dispatchKairaOutboxEvent(db, event.eventId);
      return res.status(202).json({ ok: true, eventId: event.eventId, dispatch });
    } catch (error) {
      console.error('[Kaira DM Ingress] failed:', error);
      return res.status(500).json({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
};
