import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '../lib/firebase';

const KAIRO_ID = 'kairo';
const STATE_COLLECTION = 'kdmState';
const TRACE_COLLECTION = 'kdmTraces';

export interface KairoMemoryEntry {
  userMessage: string;
  reply: string;
  createdAt?: string;
}

/**
 * Kairo'nun oturumlar arası kısa/uzun dönem konuşma bağlamı.
 * KDM trace kayıtlarını değiştirmez; yalnızca güvenli, küçük bir bağlam görünümü üretir.
 */
export async function loadKairoLongTermMemory(maxItems = 8): Promise<KairoMemoryEntry[]> {
  const safeLimit = Math.max(1, Math.min(maxItems, 20));
  try {
    const tracesRef = collection(db, STATE_COLLECTION, KAIRO_ID, TRACE_COLLECTION);
    const snapshot = await getDocs(
      query(tracesRef, orderBy('createdAt', 'desc'), limit(safeLimit))
    );

    return snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          userMessage: typeof data.userMessage === 'string' ? data.userMessage : '',
          reply: typeof data.reply === 'string' ? data.reply : '',
          createdAt: typeof data.createdAt === 'string' ? data.createdAt : undefined,
        };
      })
      .filter((item) => item.userMessage || item.reply)
      .reverse();
  } catch (error) {
    console.warn('[Kairo Memory] Could not load long-term memory:', error);
    return [];
  }
}
