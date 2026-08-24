import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface KairoMemoryEntry {
  id: string;
  category?: string;
  content: string;
  importance?: number;
  tags?: string[];
  createdAt?: string;
}

const COLLECTION = 'kairoLongTermMemory';
const MAX_MEMORY_ITEMS = 8;

const userScope = () => (auth.currentUser?.uid || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');

export async function loadKairoLongTermMemory(maxItems = MAX_MEMORY_ITEMS): Promise<KairoMemoryEntry[]> {
  try {
    const safeLimit = Math.max(1, Math.min(maxItems, MAX_MEMORY_ITEMS));
    const snap = await getDocs(
      query(
        collection(db, COLLECTION, userScope(), 'entries'),
        orderBy('createdAt', 'desc'),
        limit(safeLimit)
      )
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as KairoMemoryEntry));
  } catch {
    return [];
  }
}

export async function saveKairoLongTermMemory(entry: Omit<KairoMemoryEntry, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION, userScope(), 'entries'), {
    category: entry.category || 'user_fact',
    content: entry.content.trim(),
    importance: entry.importance ?? 1,
    tags: entry.tags || [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
