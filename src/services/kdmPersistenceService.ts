import { collection, doc, limit, orderBy, query, setDoc, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DroitDynamicState, ReasoningTrace } from '../types/nexus';

const DEFAULT_USER_ID = 'anonymous';
const STATE_COLLECTION = 'kdmState';
const TRACE_COLLECTION = 'kdmTraces';
const USER_MEMORY_COLLECTION = 'kairoMemory';
const USER_MEMORY_DOC = 'profile';
const scope = (userId?: string) => (userId || DEFAULT_USER_ID).replace(/[^a-zA-Z0-9_-]/g, '_');

export interface KdmPersistencePayload { dynamicState: DroitDynamicState; reasoningTrace: ReasoningTrace; lastUserMessage: string; reply: string; userId?: string; }
export interface KdmMemoryItem { userMessage: string; reply: string; createdAt?: string; reasoningTrace?: ReasoningTrace; dynamicState?: DroitDynamicState; }
export interface KairoUserMemory { userName?: string; preferences: string[]; facts: string[]; goals: string[]; notes: string[]; updatedAt: string; }
const emptyUserMemory = (): KairoUserMemory => ({ preferences: [], facts: [], goals: [], notes: [], updatedAt: new Date().toISOString() });
const uniqueRecent = (items: string[]) => [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(-20);

function extractMemoryCandidates(userMessage: string): Partial<KairoUserMemory> {
  const text = userMessage.trim(); const result: Partial<KairoUserMemory> = {};
  const name = text.match(/(?:benim adım|adım|ismim)\s+([A-Za-zÇĞİÖŞÜçğıöşü0-9_-]{2,40})/i);
  if (name) result.userName = name[1];
  if (/(?:artık .*? sevmiyorum|artık .*? ilgilenmiyorum)/i.test(text)) {
    result.preferences = [text];
  } else if (/(?:seviyorum|sevdiğim|favorim|hoşuma gidiyor|ilgileniyorum|ilgimi çekiyor|daha çok .*? ilgileniyorum)/i.test(text)) {
    result.preferences = [text];
  }
  if (/(?:istiyorum|hedefim|amacım|planım|üzerinde çalışıyorum|geliştiriyorum)/i.test(text)) result.goals = [text];
  if (/(?:yaşım|yaşındayım|mesleğim|işim|şehirde yaşıyorum|yaşıyorum|çalışıyorum)/i.test(text)) result.facts = [text];
  return result;
}

async function readUserProfile(userId: string): Promise<KairoUserMemory> {
  const userScope = scope(userId); let current = emptyUserMemory();
  try {
    const snapshot = await getDocs(query(collection(db, USER_MEMORY_COLLECTION, userScope, 'entries'), orderBy('updatedAt', 'desc'), limit(1)));
    if (!snapshot.empty) current = { ...current, ...(snapshot.docs[0].data() as Partial<KairoUserMemory>) };
  } catch (error) { console.warn('[Kairo User Memory] read failed:', error); }
  return current;
}

async function updateStructuredUserMemory(userId: string, userMessage: string): Promise<void> {
  const candidate = extractMemoryCandidates(userMessage);
  if (!candidate.userName && !candidate.preferences?.length && !candidate.facts?.length && !candidate.goals?.length) return;
  const userScope = scope(userId); const ref = doc(db, USER_MEMORY_COLLECTION, userScope, 'entries', USER_MEMORY_DOC); const current = await readUserProfile(userScope);
  const removingPreference = candidate.preferences?.some((item) => /artık .*?(sevmiyorum|ilgilenmiyorum)/i.test(item));
  const preferences = removingPreference
    ? uniqueRecent(current.preferences.filter((item) => !candidate.preferences!.some((replacement) => item.toLocaleLowerCase('tr-TR').includes(replacement.toLocaleLowerCase('tr-TR')))))
    : uniqueRecent([...current.preferences, ...(candidate.preferences || [])]);
  const facts = uniqueRecent([...current.facts, ...(candidate.facts || [])]);
  const goals = uniqueRecent([...current.goals, ...(candidate.goals || [])]);
  await setDoc(ref, { userName: candidate.userName || current.userName, preferences, facts, goals, notes: uniqueRecent(current.notes), updatedAt: new Date().toISOString() }, { merge: true });
}

export async function saveKdmInteraction(payload: KdmPersistencePayload): Promise<void> {
  const userScope = scope(payload.userId);
  await setDoc(doc(db, STATE_COLLECTION, userScope), { characterId: 'kairo', userId: userScope, dynamicState: payload.dynamicState, reasoningTrace: payload.reasoningTrace, lastUserMessage: payload.lastUserMessage, lastReply: payload.reply, updatedAt: new Date().toISOString() }, { merge: true });
  await addDoc(collection(db, STATE_COLLECTION, userScope, TRACE_COLLECTION), { ...payload.reasoningTrace, userMessage: payload.lastUserMessage, reply: payload.reply, dynamicState: payload.dynamicState, userId: userScope, createdAt: new Date().toISOString() });
  await updateStructuredUserMemory(userScope, payload.lastUserMessage).catch((error) => console.warn('[Kairo User Memory] save skipped:', error));
}
export async function loadKdmState(userId?: string): Promise<DroitDynamicState | null> { const userScope = scope(userId); const snap = await getDocs(query(collection(db, STATE_COLLECTION, userScope), limit(1))); if (snap.empty) return null; return (snap.docs[0].data().dynamicState as DroitDynamicState) || null; }
export async function loadRecentKdmMemory(maxItems = 6, userId?: string): Promise<KdmMemoryItem[]> {
  const userScope = scope(userId); const safeLimit = Math.max(1, Math.min(maxItems, 20));
  const snapshot = await getDocs(query(collection(db, STATE_COLLECTION, userScope, TRACE_COLLECTION), orderBy('createdAt', 'desc'), limit(safeLimit)));
  const memories: KdmMemoryItem[] = snapshot.docs.map((item) => { const data = item.data(); return { userMessage: typeof data.userMessage === 'string' ? data.userMessage : '', reply: typeof data.reply === 'string' ? data.reply : '', createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined, reasoningTrace: data as unknown as ReasoningTrace, dynamicState: data.dynamicState as DroitDynamicState | undefined }; }).filter((item) => item.userMessage || item.reply).reverse();
  try {
    const profileSnapshot = await getDocs(query(collection(db, USER_MEMORY_COLLECTION, userScope, 'entries'), orderBy('updatedAt', 'desc'), limit(1)));
    if (!profileSnapshot.empty) {
      const profile = profileSnapshot.docs[0].data() as Partial<KairoUserMemory>;
      memories.unshift({
        userMessage: 'Kairo kullanıcı profili',
        reply: JSON.stringify({
          userName: profile.userName || null,
          preferences: Array.isArray(profile.preferences) ? profile.preferences : [],
          facts: Array.isArray(profile.facts) ? profile.facts : [],
          goals: Array.isArray(profile.goals) ? profile.goals : [],
          notes: Array.isArray(profile.notes) ? profile.notes : [],
        }),
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.warn('[Kairo User Memory] profile load skipped:', error);
  }
  return memories;
}
