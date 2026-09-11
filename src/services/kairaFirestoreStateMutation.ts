import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { KairaStateMutationBackend } from './kairaDistributedStateMutation';

const COLLECTION = 'kairaStateMutationLocks';

// Firestore transactions do not expose an authoritative server "now" for comparing
// an existing numeric lease deadline. Treat a bounded amount of forward wall-clock
// disagreement as uncertainty instead of evidence that the holder has expired.
export const STATE_MUTATION_LEASE_CLOCK_SKEW_TOLERANCE_MS = 30_000;

function docId(key: string) {
  return encodeURIComponent(key).replace(/%/g, '_').slice(0, 1400);
}

function refFor(key: string) {
  return doc(db, COLLECTION, docId(key));
}

export const firestoreStateMutationBackend: KairaStateMutationBackend = {
  async acquire({ key, ownerToken, now, leaseMs }) {
    const ref = refFor(key);
    return runTransaction(db, async (tx) => {
      const snapshot = await tx.get(ref);
      const existing = snapshot.exists() ? snapshot.data() as { ownerToken?: string; leaseUntil?: number } : null;
      if (existing && typeof existing.leaseUntil === 'number' && existing.ownerToken !== ownerToken) {
        const takeoverAfter = existing.leaseUntil + STATE_MUTATION_LEASE_CLOCK_SKEW_TOLERANCE_MS;
        if (takeoverAfter > now) return false;
      }
      tx.set(ref, {
        ownerToken,
        leaseUntil: now + leaseMs,
        updatedAt: new Date(now).toISOString(),
      });
      return true;
    });
  },

  async renew({ key, ownerToken, now, leaseMs }) {
    const ref = refFor(key);
    return runTransaction(db, async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists()) return false;
      const existing = snapshot.data() as { ownerToken?: string };
      if (existing.ownerToken !== ownerToken) return false;
      tx.set(ref, {
        ownerToken,
        leaseUntil: now + leaseMs,
        updatedAt: new Date(now).toISOString(),
      });
      return true;
    });
  },

  async release({ key, ownerToken }) {
    const ref = refFor(key);
    await runTransaction(db, async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists()) return;
      const existing = snapshot.data() as { ownerToken?: string };
      if (existing.ownerToken === ownerToken) tx.delete(ref);
    });
  },
};
