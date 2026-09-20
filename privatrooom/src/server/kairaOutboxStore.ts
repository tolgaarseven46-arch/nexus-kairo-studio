import type { Firestore } from 'firebase-admin/firestore';
import type { KairaDmMessageCreatedEventV0, KairaDmIntegrationResponseV0 } from '../integrations/kaira/contracts';
import { createKairaOutboxRecordV0, type KairaOutboxRecordV0 } from '../integrations/kaira/outbox';

const COLLECTION = 'kairaOutbox';

const recordRef = (db: Firestore, eventId: string) => db.collection(COLLECTION).doc(eventId);

export const enqueueKairaOutboxEvent = async (
  db: Firestore,
  event: KairaDmMessageCreatedEventV0,
): Promise<KairaOutboxRecordV0> => {
  const ref = recordRef(db, event.eventId);
  return db.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) return existing.data() as KairaOutboxRecordV0;
    const record = createKairaOutboxRecordV0(event);
    tx.create(ref, record);
    return record;
  });
};

export const claimKairaOutboxEvent = async (
  db: Firestore,
  eventId: string,
  now = Date.now(),
): Promise<KairaOutboxRecordV0 | null> => {
  const ref = recordRef(db, eventId);
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return null;
    const current = snapshot.data() as KairaOutboxRecordV0;
    const claimable =
      (current.status === 'pending' || current.status === 'retryable_failure') &&
      (!current.nextAttemptAt || current.nextAttemptAt <= now);
    if (!claimable) return null;

    const claimed: KairaOutboxRecordV0 = {
      ...current,
      status: 'in_flight',
      attemptCount: current.attemptCount + 1,
      lastAttemptAt: now,
      lastError: undefined,
    };
    tx.set(ref, claimed);
    return claimed;
  });
};

export const completeKairaOutboxEvent = async (
  db: Firestore,
  eventId: string,
  response: KairaDmIntegrationResponseV0,
  completedAt = Date.now(),
): Promise<void> => {
  await recordRef(db, eventId).set({
    status: 'succeeded',
    response,
    completedAt,
    nextAttemptAt: null,
    lastError: null,
  }, { merge: true });
};

export const failKairaOutboxEvent = async (
  db: Firestore,
  eventId: string,
  error: string,
  retryable: boolean,
  nextAttemptAt?: number,
): Promise<void> => {
  await recordRef(db, eventId).set({
    status: retryable ? 'retryable_failure' : 'terminal_failure',
    lastError: error.slice(0, 1000),
    ...(retryable && nextAttemptAt ? { nextAttemptAt } : {}),
    ...(!retryable ? { completedAt: Date.now() } : {}),
  }, { merge: true });
};

export const getKairaOutboxEvent = async (
  db: Firestore,
  eventId: string,
): Promise<KairaOutboxRecordV0 | null> => {
  const snapshot = await recordRef(db, eventId).get();
  return snapshot.exists ? (snapshot.data() as KairaOutboxRecordV0) : null;
};
