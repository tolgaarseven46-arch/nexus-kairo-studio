import {
  claimKairaChatRequest,
  completeKairaChatRequest,
  failKairaChatRequest,
  type KairaChatRequestClaim,
} from './kairaChatIdempotency';
import { createDistributedChatIdempotency } from './kairaDistributedChatIdempotency';
import { firestoreChatIdempotencyBackend } from './kairaFirestoreChatIdempotency';
import { createDistributedStateMutationCoordinator } from './kairaDistributedStateMutation';
import { firestoreStateMutationBackend } from './kairaFirestoreStateMutation';

const distributed = createDistributedChatIdempotency<any>(firestoreChatIdempotencyBackend);
const stateMutations = createDistributedStateMutationCoordinator(firestoreStateMutationBackend);
const distributedOwners = new Map<string, string>();
const localFallbackKeys = new Set<string>();
const stateMutationReleases = new Map<string, () => Promise<void>>();
const localStateTails = new Map<string, Promise<void>>();

function stateOwnerKey(requestKey: string) {
  const separator = requestKey.lastIndexOf('::');
  return separator > 0 ? requestKey.slice(0, separator) : requestKey;
}

async function acquireLocalStateMutation(key: string): Promise<() => Promise<void>> {
  const previous = localStateTails.get(key) ?? Promise.resolve();
  let releaseCurrent!: () => void;
  const current = new Promise<void>((resolve) => { releaseCurrent = resolve; });
  const tail = previous.then(() => current);
  localStateTails.set(key, tail);
  await previous;
  let released = false;
  return async () => {
    if (released) return;
    released = true;
    releaseCurrent();
    if (localStateTails.get(key) === tail) localStateTails.delete(key);
  };
}

async function acquireStateMutation(requestKey: string) {
  const ownerKey = stateOwnerKey(requestKey);
  try {
    const lease = await stateMutations.acquire(ownerKey);
    stateMutationReleases.set(requestKey, lease.release);
  } catch (error) {
    console.warn('[Kaira State Mutation] distributed lease unavailable; using process-local serialization:', error);
    stateMutationReleases.set(requestKey, await acquireLocalStateMutation(ownerKey));
  }
}

async function releaseStateMutation(requestKey: string) {
  const release = stateMutationReleases.get(requestKey);
  stateMutationReleases.delete(requestKey);
  if (!release) return;
  try {
    await release();
  } catch (error) {
    console.warn('[Kaira State Mutation] lease release failed:', error);
  }
}

export async function claimCoordinatedKairaChatRequest<T = unknown>(key: string): Promise<KairaChatRequestClaim<T>> {
  const normalizedKey = key.trim();
  if (!normalizedKey) return { kind: 'owner' };

  await acquireStateMutation(normalizedKey);
  try {
    const claim = await distributed.claim(normalizedKey);
    if (claim.kind === 'owner') {
      distributedOwners.set(normalizedKey, claim.ownerToken);
      localFallbackKeys.delete(normalizedKey);
      return { kind: 'owner' };
    }
    await releaseStateMutation(normalizedKey);
    return claim as KairaChatRequestClaim<T>;
  } catch (error) {
    console.warn('[Kaira Idempotency] distributed claim unavailable; using process-local fallback:', error);
    localFallbackKeys.add(normalizedKey);
    const claim = claimKairaChatRequest<T>(normalizedKey);
    if (claim.kind !== 'owner') await releaseStateMutation(normalizedKey);
    return claim;
  }
}

export async function completeCoordinatedKairaChatRequest<T = unknown>(key: string, payload: T) {
  const normalizedKey = key.trim();
  if (!normalizedKey) return;
  try {
    const ownerToken = distributedOwners.get(normalizedKey);
    if (ownerToken) {
      try {
        await distributed.complete(normalizedKey, ownerToken, payload);
      } catch (error) {
        console.warn('[Kaira Idempotency] distributed completion failed; retaining process-local replay:', error);
        completeKairaChatRequest(normalizedKey, payload);
      } finally {
        distributedOwners.delete(normalizedKey);
      }
      return;
    }
    if (localFallbackKeys.has(normalizedKey)) {
      completeKairaChatRequest(normalizedKey, payload);
      localFallbackKeys.delete(normalizedKey);
    }
  } finally {
    await releaseStateMutation(normalizedKey);
  }
}

export async function failCoordinatedKairaChatRequest(key: string, error: unknown) {
  const normalizedKey = key.trim();
  if (!normalizedKey) return;
  try {
    const ownerToken = distributedOwners.get(normalizedKey);
    if (ownerToken) {
      try {
        await distributed.fail(normalizedKey, ownerToken);
      } catch (distributedError) {
        console.warn('[Kaira Idempotency] distributed failure release failed:', distributedError);
      } finally {
        distributedOwners.delete(normalizedKey);
      }
    }
    if (localFallbackKeys.has(normalizedKey)) {
      failKairaChatRequest(normalizedKey, error);
      localFallbackKeys.delete(normalizedKey);
    }
  } finally {
    await releaseStateMutation(normalizedKey);
  }
}

export function clearCoordinatedKairaChatIdempotencyForTests() {
  distributedOwners.clear();
  localFallbackKeys.clear();
  stateMutationReleases.clear();
  localStateTails.clear();
}
