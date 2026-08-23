import { collection, doc, getDocs, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const KAIRO_ID = 'kairo';
const MEMORY_COLLECTION = 'kairoMemory';
const MEMORY_DOC = 'profile';

export interface KairoUserMemory {
  userName?: string;
  preferences: string[];
  facts: string[];
  goals: string[];
  notes: string[];
  updatedAt: string;
}

const emptyMemory = (): KairoUserMemory => ({
  preferences: [], facts: [], goals: [], notes: [], updatedAt: new Date().toISOString(),
});

export async function loadKairoUserMemory(): Promise<KairoUserMemory> {
  try {
    const snapshot = await getDocs(query(collection(db, MEMORY_COLLECTION, KAIRO_ID, 'entries'), orderBy('updatedAt', 'desc'), limit(1)));
    if (!snapshot.empty) return { ...emptyMemory(), ...(snapshot.docs[0].data() as Partial<KairoUserMemory>) };
  } catch (error) {
    console.warn('[Kairo User Memory] load failed:', error);
  }
  return emptyMemory();
}

export async function saveKairoUserMemory(memory: KairoUserMemory): Promise<void> {
  const ref = doc(db, MEMORY_COLLECTION, KAIRO_ID, 'entries', MEMORY_DOC);
  await setDoc(ref, { ...memory, updatedAt: new Date().toISOString() }, { merge: true });
}

export function extractMemoryCandidates(userMessage: string): Partial<KairoUserMemory> {
  const text = userMessage.trim();
  const result: Partial<KairoUserMemory> = {};
  const name = text.match(/(?:benim adım|adım|ismim)\s+([A-Za-zÇĞİÖŞÜçğıöşü0-9_-]{2,40})/i);
  if (name) result.userName = name[1];
  if (/(?:seviyorum|sevdiğim|favorim|hoşuma gidiyor)/i.test(text)) result.preferences = [text];
  if (/(?:istiyorum|hedefim|planım)/i.test(text)) result.goals = [text];
  return result;
}

export function mergeKairoUserMemory(current: KairoUserMemory, candidate: Partial<KairoUserMemory>): KairoUserMemory {
  const unique = (items: string[] = []) => [...new Set(items.filter(Boolean))].slice(-20);
  return {
    userName: candidate.userName || current.userName,
    preferences: unique([...current.preferences, ...(candidate.preferences || [])]),
    facts: unique(current.facts),
    goals: unique([...current.goals, ...(candidate.goals || [])]),
    notes: unique(current.notes),
    updatedAt: new Date().toISOString(),
  };
}
