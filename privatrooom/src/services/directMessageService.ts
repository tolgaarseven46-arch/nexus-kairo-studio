import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, ensureFirebaseAuth } from '../firebase';

export type DirectMessageKind = 'text';

export interface DirectConversationDocument {
  conversationId: string;
  participantIds: [string, string];
  createdAt: number;
  updatedAt: number;
  lastMessageText?: string;
  lastMessageSenderId?: string;
  lastMessageAt?: number;
  lastReadAtByUid?: Record<string, number>;
}

export interface DirectMessageDocument {
  messageId: string;
  eventId: string;
  conversationId: string;
  senderUid: string;
  kind: DirectMessageKind;
  text: string;
  createdAt: number;
  replyToMessageId?: string;
  editedAt?: number;
  deletedAt?: number;
}

export interface DirectConversationSummary extends DirectConversationDocument {
  otherParticipantUid: string;
  unread: boolean;
}

const normalizeUidPair = (a: string, b: string): [string, string] =>
  a < b ? [a, b] : [b, a];

export const buildDirectConversationId = (uidA: string, uidB: string): string => {
  const [a, b] = normalizeUidPair(uidA, uidB);
  return `dm_${a}_${b}`;
};

export const createDirectMessageEventId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
};

export class DirectMessageService {
  private static async notifyKairaIngress(message: DirectMessageDocument): Promise<void> {
    const currentUser = await ensureFirebaseAuth();
    const idToken = await currentUser.getIdToken();
    const response = await fetch('/api/integrations/kaira/dm-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        conversationId: message.conversationId,
        messageId: message.messageId,
      }),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload?.error || `Kaira ingress HTTP ${response.status}`);
    }
  }

  static async ensureConversation(otherUserUid: string): Promise<DirectConversationDocument> {
    const currentUser = await ensureFirebaseAuth();
    if (!otherUserUid || currentUser.uid === otherUserUid) {
      throw new Error('Geçerli bir farklı kullanıcı seçilmelidir.');
    }

    const participantIds = normalizeUidPair(currentUser.uid, otherUserUid);
    const conversationId = buildDirectConversationId(currentUser.uid, otherUserUid);
    const conversationRef = doc(db, 'directConversations', conversationId);
    const existing = await getDoc(conversationRef);

    if (existing.exists()) {
      return existing.data() as DirectConversationDocument;
    }

    const now = Date.now();
    const conversation: DirectConversationDocument = {
      conversationId,
      participantIds,
      createdAt: now,
      updatedAt: now,
      lastReadAtByUid: {
        [currentUser.uid]: now,
        [otherUserUid]: 0,
      },
    };

    await setDoc(conversationRef, {
      ...conversation,
      createdAtServer: serverTimestamp(),
      updatedAtServer: serverTimestamp(),
    });

    return conversation;
  }

  static async sendTextMessage(
    otherUserUid: string,
    text: string,
    eventId: string = createDirectMessageEventId(),
    replyToMessageId?: string
  ): Promise<DirectMessageDocument> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Boş mesaj gönderilemez.');
    if (!eventId.trim()) throw new Error('Mesaj eventId boş olamaz.');

    const currentUser = await ensureFirebaseAuth();
    const conversation = await DirectMessageService.ensureConversation(otherUserUid);
    const messageRef = doc(db, 'directConversations', conversation.conversationId, 'messages', eventId);

    const existing = await getDoc(messageRef);
    if (existing.exists()) {
      const existingData = existing.data() as Omit<DirectMessageDocument, 'messageId'>;
      return { ...existingData, messageId: messageRef.id };
    }

    if (replyToMessageId) {
      const replyRef = doc(db, 'directConversations', conversation.conversationId, 'messages', replyToMessageId);
      const replyDoc = await getDoc(replyRef);
      if (!replyDoc.exists()) throw new Error('Yanıtlanan mesaj bulunamadı.');
    }

    const now = Date.now();
    const message: DirectMessageDocument = {
      messageId: eventId,
      eventId,
      conversationId: conversation.conversationId,
      senderUid: currentUser.uid,
      kind: 'text',
      text: trimmed,
      createdAt: now,
      ...(replyToMessageId ? { replyToMessageId } : {}),
    };

    await setDoc(messageRef, {
      eventId,
      conversationId: message.conversationId,
      senderUid: message.senderUid,
      kind: message.kind,
      text: message.text,
      createdAt: message.createdAt,
      ...(replyToMessageId ? { replyToMessageId } : {}),
    });

    await setDoc(doc(db, 'directConversations', conversation.conversationId), {
      updatedAt: now,
      updatedAtServer: serverTimestamp(),
      lastMessageText: trimmed,
      lastMessageSenderId: currentUser.uid,
      lastMessageAt: now,
      lastReadAtByUid: {
        ...(conversation.lastReadAtByUid || {}),
        [currentUser.uid]: now,
      },
    }, { merge: true });

    void DirectMessageService.notifyKairaIngress(message).catch((error) => {
      console.warn('Kaira DM ingress notification failed:', error);
    });

    return message;
  }

  static async editMessage(otherUserUid: string, messageId: string, text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) throw new Error('Mesaj boş olamaz.');

    const currentUser = await ensureFirebaseAuth();
    const conversation = await DirectMessageService.ensureConversation(otherUserUid);
    const messageRef = doc(db, 'directConversations', conversation.conversationId, 'messages', messageId);
    const existing = await getDoc(messageRef);
    if (!existing.exists()) throw new Error('Mesaj bulunamadı.');
    const data = existing.data() as Omit<DirectMessageDocument, 'messageId'>;
    if (data.senderUid !== currentUser.uid) throw new Error('Sadece kendi mesajını düzenleyebilirsin.');
    if (data.deletedAt) throw new Error('Silinmiş mesaj düzenlenemez.');

    const now = Date.now();
    await setDoc(messageRef, { text: trimmed, editedAt: now }, { merge: true });

    if (conversation.lastMessageAt === data.createdAt) {
      await setDoc(doc(db, 'directConversations', conversation.conversationId), {
        lastMessageText: trimmed,
        updatedAt: now,
      }, { merge: true });
    }
  }

  static async deleteMessage(otherUserUid: string, messageId: string): Promise<void> {
    const currentUser = await ensureFirebaseAuth();
    const conversation = await DirectMessageService.ensureConversation(otherUserUid);
    const messageRef = doc(db, 'directConversations', conversation.conversationId, 'messages', messageId);
    const existing = await getDoc(messageRef);
    if (!existing.exists()) throw new Error('Mesaj bulunamadı.');
    const data = existing.data() as Omit<DirectMessageDocument, 'messageId'>;
    if (data.senderUid !== currentUser.uid) throw new Error('Sadece kendi mesajını silebilirsin.');
    if (data.deletedAt) return;

    const now = Date.now();
    await setDoc(messageRef, { text: '', deletedAt: now }, { merge: true });

    if (conversation.lastMessageAt === data.createdAt) {
      await setDoc(doc(db, 'directConversations', conversation.conversationId), {
        lastMessageText: 'Mesaj silindi',
        updatedAt: now,
      }, { merge: true });
    }
  }

  static async markConversationRead(otherUserUid: string, readAt: number = Date.now()): Promise<void> {
    const currentUser = await ensureFirebaseAuth();
    const conversation = await DirectMessageService.ensureConversation(otherUserUid);
    await setDoc(doc(db, 'directConversations', conversation.conversationId), {
      lastReadAtByUid: {
        ...(conversation.lastReadAtByUid || {}),
        [currentUser.uid]: readAt,
      },
    }, { merge: true });
  }

  static async subscribeToConversation(
    otherUserUid: string,
    onMessages: (messages: DirectMessageDocument[]) => void,
    onError?: (error: Error) => void
  ): Promise<() => void> {
    await ensureFirebaseAuth();
    const conversation = await DirectMessageService.ensureConversation(otherUserUid);
    const messagesQuery = query(
      collection(db, 'directConversations', conversation.conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(messagesQuery, (snapshot) => {
      onMessages(snapshot.docs.map((messageDoc) => {
        const data = messageDoc.data() as Omit<DirectMessageDocument, 'messageId'>;
        return { ...data, eventId: data.eventId || messageDoc.id, messageId: messageDoc.id };
      }));
    }, (error) => onError?.(error as Error));
  }

  static async subscribeToMyConversations(
    onConversations: (conversations: DirectConversationSummary[]) => void,
    onError?: (error: Error) => void
  ): Promise<() => void> {
    const currentUser = await ensureFirebaseAuth();
    const conversationsQuery = query(collection(db, 'directConversations'), where('participantIds', 'array-contains', currentUser.uid));

    return onSnapshot(conversationsQuery, (snapshot) => {
      const summaries = snapshot.docs
        .map((conversationDoc) => conversationDoc.data() as DirectConversationDocument)
        .map((conversation) => {
          const otherParticipantUid = conversation.participantIds[0] === currentUser.uid
            ? conversation.participantIds[1]
            : conversation.participantIds[0];
          const lastReadAt = conversation.lastReadAtByUid?.[currentUser.uid] || 0;
          const unread = Boolean(conversation.lastMessageAt) &&
            conversation.lastMessageSenderId !== currentUser.uid &&
            (conversation.lastMessageAt || 0) > lastReadAt;
          return { ...conversation, otherParticipantUid, unread };
        })
        .sort((a, b) => (b.lastMessageAt || b.updatedAt) - (a.lastMessageAt || a.updatedAt));
      onConversations(summaries);
    }, (error) => onError?.(error as Error));
  }
}
