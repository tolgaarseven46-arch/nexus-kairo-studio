import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface KairoMemoryEntry {
  id: string;
  category?: string;
  content: string;
  importance?: number;
  tags?: string[];
  createdAt?: string;
}

export async function loadKairoLongTermMemory(maxItems = 8): Promise<KairoMemoryEntry[]> {
  try {
    const snap = await getDocs(
      query(collection(db, 'kairoLongTermMemory'), orderBy('createdAt', 'desc'), limit(maxItems))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as KairoMemoryEntry));
  } catch {
    return [];
  }
}
