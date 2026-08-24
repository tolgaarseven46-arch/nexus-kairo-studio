import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { TestMessage } from '../types/nexus';

const DEFAULT_USER_ID = 'anonymous';
const COLLECTION = 'kairoConversations';
const MAX_MESSAGES = 100;

const userScope = () => (auth.currentUser?.uid || DEFAULT_USER_ID).replace(/[^a-zA-Z0-9_-]/g, '_');

export async function loadKairoConversation(maxItems = MAX_MESSAGES): Promise<TestMessage[]> {
  const safeLimit = Math.max(1, Math.min(maxItems, MAX_MESSAGES));
  const scope = userScope();
  const snapshot = await getDocs(
    query(collection(db, COLLECTION, scope, 'messages'), orderBy('createdAt', 'asc'), limit(safeLimit))
  );
  return snapshot.docs
    .map((item) => {
      const data = item.data();
      return {
        id: typeof data.id === 'string' ? data.id : item.id,
        sender: data.sender === 'user' ? 'user' : 'droit',
        text: typeof data.text === 'string' ? data.text : '',
        timestamp: typeof data.timestamp === 'string' ? data.timestamp : '',
      } as TestMessage;
    })
    .filter((item) => item.text.trim());
}

export async function saveKairoConversationMessage(message: TestMessage): Promise<void> {
  const scope = userScope();
  await addDoc(collection(db, COLLECTION, scope, 'messages'), {
    id: message.id,
    sender: message.sender,
    text: message.text,
    timestamp: message.timestamp,
    createdAt: serverTimestamp(),
  });
}

export async function persistKairoConversationMessages(messages: TestMessage[]): Promise<void> {
  for (const message of messages.slice(-MAX_MESSAGES)) {
    await saveKairoConversationMessage(message);
  }
}
