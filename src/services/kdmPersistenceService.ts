import { collection, doc, limit, orderBy, query, setDoc, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DroitDynamicState, ReasoningTrace } from '../types/nexus';

const KAIRO_ID = 'kairo';
const STATE_COLLECTION = 'kdmState';
const TRACE_COLLECTION = 'kdmTraces';

export interface KdmPersistencePayload {
  dynamicState: DroitDynamicState;
  reasoningTrace: ReasoningTrace;
  lastUserMessage: string;
  reply: string;
}

export interface KdmMemoryItem {
  userMessage: string;
  reply: string;
  createdAt?: string;
  reasoningTrace?: ReasoningTrace;
  dynamicState?: DroitDynamicState;
}

export async function saveKdmInteraction(payload: KdmPersistencePayload): Promise<void> {
  const stateRef = doc(db, STATE_COLLECTION, KAIRO_ID);
  await setDoc(stateRef, {
    characterId: KAIRO_ID,
    dynamicState: payload.dynamicState,
    reasoningTrace: payload.reasoningTrace,
    lastUserMessage: payload.lastUserMessage,
    lastReply: payload.reply,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  const tracesRef = collection(db, STATE_COLLECTION, KAIRO_ID, TRACE_COLLECTION);
  await addDoc(tracesRef, {
    ...payload.reasoningTrace,
    userMessage: payload.lastUserMessage,
    reply: payload.reply,
    dynamicState: payload.dynamicState,
    createdAt: new Date().toISOString(),
  });
}

export async function loadKdmState(): Promise<DroitDynamicState | null> {
  const stateSnap = await getDocs(query(collection(db, STATE_COLLECTION), orderBy('updatedAt', 'desc'), limit(1)));
  if (stateSnap.empty) return null;
  return (stateSnap.docs[0].data().dynamicState as DroitDynamicState) || null;
}

export async function loadRecentKdmMemory(maxItems = 6): Promise<KdmMemoryItem[]> {
  const safeLimit = Math.max(1, Math.min(maxItems, 20));
  const tracesRef = collection(db, STATE_COLLECTION, KAIRO_ID, TRACE_COLLECTION);
  const snapshot = await getDocs(query(tracesRef, orderBy('createdAt', 'desc'), limit(safeLimit)));

  return snapshot.docs
    .map((item) => {
      const data = item.data();
      return {
        userMessage: typeof data.userMessage === 'string' ? data.userMessage : '',
        reply: typeof data.reply === 'string' ? data.reply : '',
        createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
        reasoningTrace: data as unknown as ReasoningTrace,
        dynamicState: data.dynamicState as DroitDynamicState | undefined,
      };
    })
    .filter((item) => item.userMessage || item.reply)
    .reverse();
}
