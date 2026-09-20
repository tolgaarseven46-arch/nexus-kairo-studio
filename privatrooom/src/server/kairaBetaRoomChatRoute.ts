import type { Express, Request, Response } from 'express';
import { createHash, randomUUID } from 'node:crypto';
import {
  buildKairaDmMessageCreatedEventV0,
  isKairaDmIntegrationResponseV0,
} from '../integrations/kaira/contracts';
import {
  assertPrivatRoomEffectAllowed,
  resolveKairaTestExecutionContext,
} from './kairaTestExecutionGuard';
import { getPrivatRoomAdminDb } from './firebaseAdmin';
import { loadKairaRoomConversationContext } from './kairaRoomConversationContext';
import {
  isKairaParticipant,
  isKairaPresenceActive,
} from './kairaInviteContract';

const safeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 160);

const roomTurnTails = new Map<string, Promise<void>>();

const acquireRoomTurnLock = async (roomId: string): Promise<() => void> => {
  const previous = roomTurnTails.get(roomId) ?? Promise.resolve();
  let releaseCurrent!: () => void;
  const current = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  const nextTail = previous.catch(() => undefined).then(() => current);
  roomTurnTails.set(roomId, nextTail);
  await previous.catch(() => undefined);

  return () => {
    releaseCurrent();
    if (roomTurnTails.get(roomId) === nextTail) {
      roomTurnTails.delete(roomId);
    }
  };
};

const resolveKairaEndpoint = (): string | null => {
  const base = process.env.KAIRA_API_URL?.trim();
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/api/integrations/privatroom/dm`;
};

export const registerKairaBetaRoomChatRoute = (app: Express): void => {
  app.post('/api/integrations/kaira/beta-room-chat', async (req: Request, res: Response) => {
    console.log('[Kaira Beta Room] request received', {
      roomId: String(req.body?.roomId || ''),
      messageId: String(req.body?.messageId || ''),
      hasText: Boolean(String(req.body?.text || '').trim()),
    });
    const text = String(req.body?.text || '').trim();
    const roomId = String(req.body?.roomId || '').trim();
    const generatedTestRunId = roomId ? `TR_live_beta_${safeId(roomId)}` : '';
    const testContext = resolveKairaTestExecutionContext({
      modeHeader: req.header('x-kaira-test-mode') || 'test',
      testRunIdHeader: req.header('x-kaira-test-run-id') || generatedTestRunId,
      environmentIdHeader: req.header('x-kaira-environment-id') || 'live-beta',
    });

    try {
      assertPrivatRoomEffectAllowed(testContext, 'kaira.upstream.request');
    } catch (error) {
      console.warn('[Kaira Beta Room] replay side effect blocked', {
        testRunId: testContext.testRunId,
        mode: testContext.mode,
      });
      return res.status(409).json({
        ok: false,
        error: error instanceof Error ? error.message : 'replay_side_effect_denied',
      });
    }
    const userId = String(req.body?.userId || 'beta_room_user').trim();
    const userName = String(req.body?.userName || 'Siz').trim();
    const username = String(req.body?.username || '').trim();
    const instanceId = process.env.KAIRA_DEFAULT_INSTANCE_ID?.trim();
    const token = process.env.KAIRA_INTEGRATION_TOKEN?.trim();
    const endpoint = resolveKairaEndpoint();
    const privatRoomCommit =
      process.env.RENDER_GIT_COMMIT?.trim() ||
      process.env.PRIVATROOM_GIT_COMMIT?.trim() ||
      '';

    if (!text || !roomId) {
      return res.status(400).json({ ok: false, error: 'text_and_room_required' });
    }
    if (!instanceId || !token || !endpoint) {
      return res.status(503).json({ ok: false, error: 'kaira_integration_not_configured' });
    }
    if (!testContext.testRunId || !testContext.environmentId || !privatRoomCommit) {
      return res.status(503).json({ ok: false, error: 'kaira_test_provenance_not_configured' });
    }

    const roomDb = getPrivatRoomAdminDb();
    if (!roomDb) {
      return res.status(503).json({ ok: false, error: 'firebase_admin_not_ready' });
    }

    const releaseRoomTurn = await acquireRoomTurnLock(roomId);
    try {
    const roomSnap = await roomDb.collection('rooms').doc(roomId).get();
    if (!roomSnap.exists) {
      return res.status(404).json({ ok: false, error: 'room_not_found' });
    }
    const room = roomSnap.data() as any;
    const participants = Array.isArray(room?.participants) ? room.participants : [];
    if (!isKairaPresenceActive(room) || !isKairaParticipant(participants)) {
      return res.status(409).json({ ok: false, error: 'kaira_not_active' });
    }

    const messageId = String(req.body?.messageId || `beta_${Date.now()}_${randomUUID()}`);
    const eventId = `betaroom_${createHash('sha256').update(`${roomId}:${messageId}`).digest('hex').slice(0, 24)}`;
    const messageCreatedAt = Date.now();
    const roomContext = await loadKairaRoomConversationContext({
      db: roomDb,
      roomId,
      actorUserId: userId || 'beta_room_user',
      currentMessageText: text,
      currentMessageCreatedAt: messageCreatedAt,
    });

    const event = buildKairaDmMessageCreatedEventV0({
      eventId,
      occurredAt: Date.now(),
      kairaInstanceId: instanceId,
      conversationId: `room:${roomId}`,
      conversationKind: 'room',
      roomContext,
      participantIds: [userId || 'beta_room_user', 'droit_kaira_beta'],
      actor: {
        userId: userId || 'beta_room_user',
        displayName: userName || 'Siz',
        username: username || undefined,
      },
      message: {
        messageId: safeId(messageId),
        text,
        createdAt: messageCreatedAt,
      },
      capabilities: ['message.send'],
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25_000);
      let response: globalThis.Response;
      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'X-Kaira-Test-Mode': testContext.mode,
            'X-Kaira-Test-Run-Id': testContext.testRunId,
            'X-Kaira-Environment-Id': testContext.environmentId,
            'X-PrivatRoom-Git-Commit': privatRoomCommit,
            'X-Kaira-Scenario-Pack-Version': 'social-platform-v0.4',
          },
          body: JSON.stringify(event),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        console.error('[Kaira Beta Room] upstream error', response.status, payload);
        return res.status(502).json({ ok: false, error: `kaira_http_${response.status}` });
      }
      if (!isKairaDmIntegrationResponseV0(payload) || payload.sourceEventId !== eventId) {
        console.error('[Kaira Beta Room] invalid upstream response', payload);
        return res.status(502).json({ ok: false, error: 'invalid_kaira_response' });
      }

      const testCapture =
        payload && typeof (payload as any).testCapture === 'object'
          ? (payload as any).testCapture
          : null;

      const reply = payload.proposedActions.find(
        (action) =>
          action.type === 'message.send' &&
          action.conversationId === `room:${roomId}` &&
          action.text.trim().length > 0,
      );

      const proposedReplyText = reply?.text?.trim() || '';
      let replyText = proposedReplyText;
      let replyMessageId: string | null = null;
      let supersededByMessageId: string | null = null;

      if (replyText) {
        const recentMessages = await roomDb
          .collection('rooms')
          .doc(roomId)
          .collection('messages')
          .orderBy('createdAtServer', 'desc')
          .limit(12)
          .get()
          .catch(() => null);

        const latestHumanMessage = recentMessages?.docs.find((messageDoc) => {
          const data = messageDoc.data() as any;
          const senderUid = String(data?.senderUid || '');
          return (
            senderUid &&
            !senderUid.startsWith('droit_kaira_') &&
            data?.source !== 'kaira_integration' &&
            data?.messageSource !== 'kaira_integration'
          );
        });

        if (latestHumanMessage && latestHumanMessage.id !== messageId) {
          supersededByMessageId = latestHumanMessage.id;
          replyText = '';
          console.log(
            `[Kaira Beta Room] stale reply suppressed room=${roomId} event=${eventId} newerMessage=${supersededByMessageId}`,
          );
        }
      }

      if (replyText) {
        replyMessageId = `kaira_${eventId}`;
        const replyRef = roomDb
          .collection('rooms')
          .doc(roomId)
          .collection('messages')
          .doc(replyMessageId);

        await replyRef.set({
          id: replyMessageId,
          senderUid: 'droit_kaira_22261aadeb3a5d02eed3',
          senderName: 'Kaira',
          senderUsername: 'kaira',
          senderAvatar:
            'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Kaira&backgroundColor=5865f2',
          content: replyText,
          timestamp: new Date().toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          roleColor: '#7c5cff',
          roleIcon: '◆',
          roleName: 'Sunucu Yöneticisi',
          messageSource: 'kaira_integration',
          source: 'kaira_integration',
          sourceEventId: eventId,
          responseId: payload.responseId,
          createdAtServer: new Date(),
        });
      }

      console.log(
        `[Kaira Beta Room] completed room=${roomId} user=${userId || 'beta_room_user'} reply=${Boolean(reply)} testRun=${testContext.testRunId} persisted=${Boolean(testCapture?.persisted)}`,
      );

      return res.json({
        ok: true,
        testRunId: testContext.testRunId,
        environmentId: testContext.environmentId,
        eventId,
        responseId: payload.responseId,
        testCapture,
        reply: replyText,
        replyMessageId,
        noReplyReason:
          supersededByMessageId
            ? 'superseded_by_newer_user_message'
            : payload.noReplyReason || null,
        supersededByMessageId,
        conversationGraphObservationProof:
          payload && typeof payload.conversationGraphObservationProof === 'object'
            ? payload.conversationGraphObservationProof
            : null,
      });
    } catch (error: any) {
      console.error('[Kaira Beta Room] failed', error);
      return res.status(502).json({
        ok: false,
        error: error?.name === 'AbortError' ? 'kaira_timeout' : error?.message || 'kaira_bridge_failed',
      });
    }
    } finally {
      releaseRoomTurn();
    }
  });
};
