import { collection, doc, limit, orderBy, query, setDoc, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DroitDynamicState, ReasoningTrace } from '../types/nexus';

const KAIRO_ID = 'kairo';
const STATE_COLLECTION = 'kdmState';
const TRACE_COLLECTION = 'kdmTraces';
const USER_MEMORY_COLLECTION = 'kairoMemory';
const USER_MEMORY_DOC = 'profile';

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

export interface KairoUserMemory {
  userName?: string;
  preferences: string[];
  facts: string[];
  goals: string[];
  notes: string[];
  updatedAt: string;
}

const emptyUserMemory = (): KairoUserMemory => ({ preferences: [], facts: [], goals: [], notes: [], updatedAt: new Date().toISOString() });
const uniqueRecent = (items: string[]) => [...new Set(items.filter(Boolean))].slice(-20);

function extractMemoryCandidates(userMessage: string): Partial<KairoUserMemory> {
  const text = userMessage.trim();
  const result: Partial<KairoUserMemory> = {};
  const name = text.match(/(?:benim adım|adım|ismim)\s+([A-Za-zÇĞİÖŞÜçğıöşü0-9_-]{2,40})/i);
  if (name) result.userName = name[1];
  if (/(?:seviyorum|sevdiğim|favorim|hoşuma gidiyor)/i.test(text)) result.preferences = [text];
  if (/(?:istiyorum|hedefim|planım)/i.test(text)) result.goals = [text];
  return result;
}

async function updateStructuredUserMemory(userMessage: string): Promise<void> {
  const candidate = extractMemoryCandidates(userMessage);
  if (!candidate.userName && !candidate.preferences?.length && !candidate.goals?.length) return;

  const ref = doc(db, USER_MEMORY_COLLECTION, KAIRO_ID, USER_MEMORY_DOC);
  let current = emptyUserMemory();
  try {
    const snapshot = await getDocs(query(collection(db, USER_MEMORY_COLLECTION, KAIRO_ID, 'entries'), orderBy('updatedAt', 'desc'), limit(1)));
    if (!snapshot.empty) current = { ...current, ...(snapshot.docs[0].data() as Partial<KairoUserMemory>) };
  } catch (error) {
    console.warn('[Kairo User Memory] read failed:', error);
  }

  await setDoc(ref, {
    userName: candidate.userName || current.userName,
    preferences: uniqueRecent([...current.preferences, ...(candidate.preferences || [])]),
    facts: uniqueRecent(current.facts),
    goals: uniqueRecent([...current.goals, ...(candidate.goals || [])]),
    notes: uniqueRecent(current.notes),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
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

  await updateStructuredUserMemory(payload.lastUserMessage).catch((error) => console.warn('[Kairo User Memory] save skipped:', error));
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

  const memories = snapshot.docs
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

  try {
    const profileSnapshot = await getDocs(query(collection(db, USER_MEMORY_COLLECTION, KAIRO_ID, 'entries'), orderBy('updatedAt', 'desc'), limit(1)));
    if (!profileSnapshot.empty) {
      const profile = profileSnapshot.docs[0].data() as Partial<KairoUserMemory>;
      const summary = JSON.stringify({
        userName: profile.userName || null,
        preferences: Array.isArray(profile.preferences) ? profile.preferences : [],
        facts: Array.isArray(profile.facts) ? profile.facts : [],
        goals: Array.isArray(profile.goals) ? profile.goals : [],
        notes: Array.isArray(profile.notes) ? profile.notes : [],
      });
      memories.unshift({ userMessage: 'Kairo kullanıcı profili', reply: summary });
    }
  } catch (error) {
    console.warn('[Kairo User Memory] profile load skipped:', error);
  }

  return memories;
}
