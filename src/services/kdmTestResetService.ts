import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const scope = (userId: string) => (userId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '_');

export async function resetKdmTestUser(userId: string): Promise<void> {
  const userScope = scope(userId);
  const stateRef = doc(db, 'kdmState', userScope);

  // Alt koleksiyonlar parent doküman silinince otomatik silinmez; temiz test için
  // ilişki trace'lerini de kaldırıyoruz. KNT debug geçmişini özellikle koruyoruz.
  const traces = await getDocs(collection(stateRef, 'kdmTraces'));
  await Promise.all(traces.docs.map((item) => deleteDoc(item.ref)));
  await deleteDoc(stateRef);
}
