import type { Firestore } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';

const principalUidForInstance = (instanceId: string): string => {
  const digest = createHash('sha256').update(instanceId).digest('hex').slice(0, 20);
  return `droit_kaira_${digest}`;
};

export const getKairaPrincipalReadiness = async (
  db: Firestore | null,
  instanceId: string | undefined,
): Promise<{
  configured: boolean;
  ready: boolean;
  uid: string | null;
  username: string | null;
}> => {
  const normalizedInstanceId = instanceId?.trim() || '';
  if (!normalizedInstanceId || !db) {
    return {
      configured: Boolean(normalizedInstanceId),
      ready: false,
      uid: normalizedInstanceId ? principalUidForInstance(normalizedInstanceId) : null,
      username: null,
    };
  }

  const uid = principalUidForInstance(normalizedInstanceId);
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) {
    return { configured: true, ready: false, uid, username: null };
  }

  const data = snap.data() || {};
  const ready =
    data.principalType === 'droit' &&
    data.droitProvider === 'kaira' &&
    data.droitInstanceId === normalizedInstanceId &&
    data.systemManaged === true;

  return {
    configured: true,
    ready,
    uid,
    username: typeof data.username === 'string' ? data.username : null,
  };
};
