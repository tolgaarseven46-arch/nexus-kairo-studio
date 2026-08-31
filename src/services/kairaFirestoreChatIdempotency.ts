import { deleteDoc, doc, getDoc, runTransaction, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  DistributedChatIdempotencyBackend,
  DistributedChatRecord,
} from './kairaDistributedChatIdempotency';

const COLLECTION = 'kairaChatIdempotency';

function docId(key: string) {
  return encodeURIComponent(key).replace(/%/g, '_').slice(0, 1400);
}

function refFor(key: string) {
  return doc(db, COLLECTION, docId(key));
}

function serializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const firestoreChatIdempotencyBackend: DistributedChatIdempotencyBackend<any> = {
  async claim({ key, ownerToken, now, leaseMs, ttlMs }) {
    const ref = refFor(key);
    return runTransaction(db, async (tx) => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.exists()
        ? snapshot.data() as Partial<DistributedChatRecord<any>>
        : null;

      if (
        existing?.status === 'completed' &&
        typeof existing.expiresAt === 'number' &&
        existing.expiresAt > now &&
        existing.payload !== undefined
      ) {
        return { kind: 'replay' as const, payload: existing.payload };
      }

      if (
        existing?.status === 'processing' &&
        typeof existing.leaseUntil === 'number' &&
        existing.leaseUntil > now
      ) {
        return { kind: 'wait' as const };
      }

      tx.set(ref, {
        status: 'processing',
        ownerToken,
        leaseUntil: now + leaseMs,
        expiresAt: now + ttlMs,
        updatedAt: new Date(now).toISOString(),
      });
      return { kind: 'owner' as const };
    });
  },

  async read(key) {
    const snapshot = await getDoc(refFor(key));
    if (!snapshot.exists()) return null;
    const data = snapshot.data() as Partial<DistributedChatRecord<any>>;
    if (data.status !== 'processing' && data.status !== 'completed') return null;
    return {
      status: data.status,
      ownerToken: typeof data.ownerToken === 'string' ? data.ownerToken : '',
      leaseUntil: typeof data.leaseUntil === 'number' ? data.leaseUntil : 0,
      expiresAt: typeof data.expiresAt === 'number' ? data.expiresAt : 0,
      ...(data.payload !== undefined ? { payload: data.payload } : {}),
    };
  },

  async complete({ key, ownerToken, payload, now, ttlMs }) {
    const ref = refFor(key);
    await runTransaction(db, async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists()) return;
      const existing = snapshot.data() as Partial<DistributedChatRecord<any>>;
      if (existing.ownerToken !== ownerToken || existing.status !== 'processing') return;
      tx.set(ref, {
        status: 'completed',
        ownerToken,
        leaseUntil: now,
        expiresAt: now + ttlMs,
        payload: serializable(payload),
        updatedAt: new Date(now).toISOString(),
      });
    });
  },

  async fail({ key, ownerToken }) {
    const ref = refFor(key);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return;
    const existing = snapshot.data() as Partial<DistributedChatRecord<any>>;
    if (existing.ownerToken === ownerToken && existing.status === 'processing') {
      await deleteDoc(ref);
    }
  },
};

export async function pruneCompletedChatIdempotency(key: string, now = Date.now()) {
  const ref = refFor(key);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return;
  const existing = snapshot.data() as Partial<DistributedChatRecord<any>>;
  if (typeof existing.expiresAt === 'number' && existing.expiresAt <= now) {
    await deleteDoc(ref).catch(() => undefined);
  }
}
