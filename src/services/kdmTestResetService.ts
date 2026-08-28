import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { clearKairoConversation } from './kairoConversationService';

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

const TEST_USER_SCOPES = [
  'test_user_x',
  'test_user_y',
  'knt_test_user_x_new',
  'knt_test_user_x_familiar',
  'knt_test_user_x_close',
  'knt_test_user_y_new',
  'knt_test_user_y_familiar',
  'knt_test_user_y_close',
] as const;

async function clearSubcollection(
  parentCollection: string,
  parentId: string,
  childCollection: string,
): Promise<void> {
  const snapshot = await getDocs(
    collection(doc(db, parentCollection, parentId), childCollection),
  );
  await Promise.all(snapshot.docs.map((item) => deleteDoc(item.ref)));
}

export async function clearAllKairoTestData(): Promise<void> {
  for (const userId of TEST_USER_SCOPES) {
    const userScope = scope(userId);
    await Promise.all([
      clearSubcollection('kdmState', userScope, 'kdmTraces'),
      clearSubcollection('kdmState', userScope, 'kntTraces'),
      clearSubcollection('kairoMemory', userScope, 'entries'),
    ]);
    await Promise.all([
      deleteDoc(doc(db, 'kdmState', userScope)),
      deleteDoc(doc(db, 'kairoLanguageMemory', userScope)),
    ]);
  }
  await clearKairoConversation();
}
