import { createHash } from 'node:crypto';
import { FieldValue, type Firestore, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import {
  buildKairaDmMessageCreatedEventV0,
  isKairaDmIntegrationResponseV0,
  type KairaDmIntegrationResponseV0,
} from '../integrations/kaira/contracts';

const resolveEndpoint = (): string | null => {
  const base = process.env.KAIRA_API_URL?.trim();
  if (!base) return null;
  const explicit = process.env.KAIRA_DM_ENDPOINT?.trim();
  if (explicit) return explicit;
  return `${base.replace(/\/$/, '')}/api/integrations/privatroom/dm`;
};

const stableId = (value: string, prefix: string): string => {
  const digest = createHash('sha256').update(value).digest('hex').slice(0, 24);
  return `${prefix}_${digest}`;
};

const resolvePrincipal = async (db: Firestore, instanceId: string) => {
  const snap = await db.collection('users')
    .where('principalType', '==', 'droit')
    .where('droitProvider', '==', 'kaira')
    .where('droitInstanceId', '==', instanceId)
    .limit(2)
    .get();

  if (snap.size !== 1) {
    throw new Error(`Kaira principal bulunamadı veya tekil değil: ${instanceId}`);
  }

  const doc = snap.docs[0];
  const data = doc.data();
  return {
    uid: doc.id,
    displayName: String(data.displayName || 'Kairo'),
    username: String(data.username || 'kairo'),
    avatarUrl: String(
      data.avatarUrl ||
        'https://api.dicebear.com/9.x/notionists-neutral/svg?seed=Kairo&backgroundColor=5865f2',
    ),
    roleName: String(data.droitRoleTitle || 'Sunucu Yöneticisi'),
  };
};

const callKaira = async (event: ReturnType<typeof buildKairaDmMessageCreatedEventV0>) => {
  const endpoint = resolveEndpoint();
  const token = process.env.KAIRA_INTEGRATION_TOKEN?.trim();
  if (!endpoint || !token) throw new Error('Kaira integration yapılandırılmamış.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(event),
      signal: controller.signal,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Kaira gateway HTTP ${response.status}`);
    if (!isKairaDmIntegrationResponseV0(payload) || payload.sourceEventId !== event.eventId) {
      throw new Error('Kaira geçersiz kanal-mention cevabı döndürdü.');
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
};

const applyRoomReply = async (
  db: Firestore,
  roomId: string,
  sourceEventId: string,
  response: KairaDmIntegrationResponseV0,
  principal: Awaited<ReturnType<typeof resolvePrincipal>>,
): Promise<number> => {
  let applied = 0;
  for (let index = 0; index < response.proposedActions.length; index += 1) {
    const action = response.proposedActions[index];
    if (action.type !== 'message.send' || !action.text.trim()) continue;
    if (action.conversationId !== `room:${roomId}`) continue;

    const id = stableId(`${response.responseId}:${index}`, 'kairo_room');
    const ref = db.collection('rooms').doc(roomId).collection('messages').doc(id);
    const wrote = await db.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists) return false;
      tx.create(ref, {
        id,
        senderUid: principal.uid,
        senderName: principal.displayName,
        senderUsername: principal.username,
        senderAvatar: principal.avatarUrl,
        content: action.text.trim(),
        timestamp: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        roleColor: '#7c5cff',
        roleIcon: '◆',
        roleName: principal.roleName,
        createdAtServer: FieldValue.serverTimestamp(),
        source: 'kaira_integration',
        sourceEventId,
        responseId: response.responseId,
      });
      return true;
    });
    if (wrote) applied += 1;
  }
  return applied;
};

const processRoomMessage = async (db: Firestore, messageDoc: QueryDocumentSnapshot): Promise<void> => {
  const roomRef = messageDoc.ref.parent.parent;
  if (!roomRef || roomRef.parent.id !== 'rooms') return;

  const data = messageDoc.data();
  const text = String(data.content || '');
  const senderUid = String(data.senderUid || '');
  if (!senderUid || !text.trim() || senderUid.startsWith('droit_kaira_')) return;

  const instanceId = process.env.KAIRA_DEFAULT_INSTANCE_ID?.trim();
  if (!instanceId) throw new Error('KAIRA_DEFAULT_INSTANCE_ID yapılandırılmamış.');

  const roomId = roomRef.id;
  const eventId = stableId(`${roomId}:${messageDoc.id}`, 'roommessage');
  const receiptRef = db.collection('kairaRoomAutoReplyReceipts').doc(eventId);

  const claimed = await db.runTransaction(async (tx) => {
    const receipt = await tx.get(receiptRef);
    if (receipt.exists) return false;
    tx.create(receiptRef, {
      eventId,
      roomId,
      messageId: messageDoc.id,
      status: 'processing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return true;
  });
  if (!claimed) return;

  try {
    const principal = await resolvePrincipal(db, instanceId);
    const actorName = String(data.senderName || data.senderUsername || 'Kullanıcı');
    const event = buildKairaDmMessageCreatedEventV0({
      eventId,
      occurredAt: Date.now(),
      kairaInstanceId: instanceId,
      conversationId: `room:${roomId}`,
      conversationKind: 'room',
      participantIds: [senderUid, principal.uid],
      actor: {
        userId: senderUid,
        displayName: actorName,
        username: data.senderUsername ? String(data.senderUsername) : undefined,
      },
      message: {
        messageId: messageDoc.id,
        text,
        createdAt: Date.now(),
      },
      capabilities: ['message.send'],
    });

    const response = await callKaira(event);
    const applied = await applyRoomReply(db, roomId, eventId, response, principal);
    await receiptRef.set(
      {
        status: 'completed',
        responseId: response.responseId,
        appliedActions: applied,
        noReplyReason: response.noReplyReason || null,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
    console.log(`[Kaira Room Auto Reply] completed room=${roomId} message=${messageDoc.id} applied=${applied}`);
  } catch (error) {
    console.error('[Kaira Room Auto Reply] failed:', error);
    await receiptRef.delete().catch(() => undefined);
  }
};

export const startKairaRoomMentionBridge = (db: Firestore): (() => void) => {
  let initialSnapshot = true;
  const unsubscribe = db.collectionGroup('messages').onSnapshot(
    (snapshot) => {
      if (initialSnapshot) {
        initialSnapshot = false;
        console.log(`[Kaira Room Auto Reply] initial history ignored count=${snapshot.size}`);
        return;
      }

      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') continue;

        console.log(`[Kaira Room Auto Reply] new message observed path=${change.doc.ref.path}`);
        void processRoomMessage(db, change.doc).catch((error) => {
          console.error('[Kaira Room Auto Reply] processing error:', error);
        });
      }
    },
    (error) => {
      console.error('[Kaira Room Auto Reply] listener failed:', error);
    },
  );

  console.log('[Kaira Room Auto Reply] listener ready');
  return unsubscribe;
};
