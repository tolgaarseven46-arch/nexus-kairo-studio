import {
  claimKairaChatRequest,
  completeKairaChatRequest,
  failKairaChatRequest,
  type KairaChatRequestClaim,
} from './kairaChatIdempotency';
import { createDistributedChatIdempotency } from './kairaDistributedChatIdempotency';
import { firestoreChatIdempotencyBackend } from './kairaFirestoreChatIdempotency';
import {
  createDistributedStateMutationCoordinator,
  KairaStateMutationOwnershipLostError,
} from './kairaDistributedStateMutation';
import { firestoreStateMutationBackend } from './kairaFirestoreStateMutation';
import {
  claimFirstEncounterCoordination,
  FIRST_ENCOUNTER_STATE_LEASE_MS,
} from './kairaFirestoreCombinedCoordination';

const distributed = createDistributedChatIdempotency<any>(firestoreChatIdempotencyBackend);
const stateMutations = createDistributedStateMutationCoordinator(firestoreStateMutationBackend);
const distributedOwners = new Map<string, string>();
const localFallbackKeys = new Set<string>();
type StateMutationHandle = {
  assertHeld: () => Promise<void>;
  assertOwned: () => Promise<void>;
  release: () => Promise<void>;
};
const stateMutationHandles = new Map<string, StateMutationHandle>();
const localStateTails = new Map<string, Promise<void>>();

function stateOwnerKey(requestKey: string) {
  const separator = requestKey.lastIndexOf('::');
  return separator > 0 ? requestKey.slice(0, separator) : requestKey;
}

async function acquireLocalStateMutation(key: string): Promise<StateMutationHandle> {
  const previous = localStateTails.get(key) ?? Promise.resolve();
  let releaseCurrent!: () => void;
  const current = new Promise<void>((resolve) => { releaseCurrent = resolve; });
  const tail = previous.then(() => current);
  localStateTails.set(key, tail);
  await previous;
  let released = false;
  const assertHeld = async () => {
    if (released) throw new KairaStateMutationOwnershipLostError();
  };
  return {
    assertHeld,
    assertOwned: assertHeld,
    release: async () => {
      if (released) return;
      released = true;
      releaseCurrent();
      if (localStateTails.get(key) === tail) localStateTails.delete(key);
    },
  };
}

function registerPreclaimedStateMutation(requestKey: string, stateOwnerToken: string) {
  const ownerKey = stateOwnerKey(requestKey);
  let released = false;
  let ownershipLost = false;
  let renewing = false;
  const assertHeld = async () => {
    if (released || ownershipLost) throw new KairaStateMutationOwnershipLostError();
  };
  const renew = async () => {
    await assertHeld();
    const renewed = await firestoreStateMutationBackend.renew({
      key: ownerKey,
      ownerToken: stateOwnerToken,
      now: Date.now(),
      leaseMs: FIRST_ENCOUNTER_STATE_LEASE_MS,
    });
    if (!renewed) {
      ownershipLost = true;
      throw new KairaStateMutationOwnershipLostError();
    }
  };
  const timer = setInterval(async () => {
    if (released || ownershipLost || renewing) return;
    renewing = true;
    try {
      await renew();
    } catch (error) {
      if (error instanceof KairaStateMutationOwnershipLostError) clearInterval(timer);
      console.warn('[Kaira State Mutation] preclaimed lease renewal failed:', error);
    } finally {
      renewing = false;
    }
  }, Math.max(5_000, Math.floor(FIRST_ENCOUNTER_STATE_LEASE_MS / 3)));
  (timer as any).unref?.();

  stateMutationHandles.set(requestKey, {
    assertHeld,
    assertOwned: renew,
    release: async () => {
      if (released) return;
      released = true;
      clearInterval(timer);
      await firestoreStateMutationBackend.release({
        key: ownerKey,
        ownerToken: stateOwnerToken,
      });
    },
  });
}

async function acquireStateMutation(requestKey: string) {
  const ownerKey = stateOwnerKey(requestKey);
  try {
    const lease = await stateMutations.acquire(ownerKey);
    stateMutationHandles.set(requestKey, {
      assertHeld: lease.assertHeld,
      assertOwned: lease.assertOwned,
      release: lease.release,
    });
  } catch (error) {
    console.warn('[Kaira State Mutation] distributed lease unavailable; using process-local serialization:', error);
    stateMutationHandles.set(requestKey, await acquireLocalStateMutation(ownerKey));
  }
}

export async function assertCoordinatedKairaChatStateOwnership(requestKey: string) {
  const normalizedKey = requestKey.trim();
  if (!normalizedKey) return;
  const handle = stateMutationHandles.get(normalizedKey);
  if (!handle) throw new KairaStateMutationOwnershipLostError();
  await handle.assertHeld();
}

async function releaseStateMutation(requestKey: string) {
  const handle = stateMutationHandles.get(requestKey);
  stateMutationHandles.delete(requestKey);
  if (!handle) return;
  try {
    await handle.release();
  } catch (error) {
    console.warn('[Kaira State Mutation] lease release failed:', error);
  }
}

export async function claimCoordinatedKairaChatRequest<T = unknown>(
  key: string,
  options: { preferCombinedFirstEncounterCoordination?: boolean } = {},
): Promise<KairaChatRequestClaim<T>> {
  const normalizedKey = key.trim();
  if (!normalizedKey) return { kind: 'owner' };

  if (options.preferCombinedFirstEncounterCoordination) {
    try {
      const combined = await claimFirstEncounterCoordination<T>(normalizedKey);
      if (combined.kind === 'owner') {
        registerPreclaimedStateMutation(normalizedKey, combined.stateOwnerToken);
        distributedOwners.set(normalizedKey, combined.idempotencyOwnerToken);
        localFallbackKeys.delete(normalizedKey);
        return { kind: 'owner' };
      }
      if (combined.kind === 'replay') return combined;
      return await distributed.claim(normalizedKey) as KairaChatRequestClaim<T>;
    } catch (error) {
      console.warn('[Kaira Coordination] combined first-encounter claim unavailable; falling back:', error);
    }
  }

  const stateMutationPromise = acquireStateMutation(normalizedKey);
  const claimPromise = distributed.claim(normalizedKey);
  try {
    const claim = await claimPromise;
    if (claim.kind === 'owner') {
      await stateMutationPromise;
      distributedOwners.set(normalizedKey, claim.ownerToken);
      localFallbackKeys.delete(normalizedKey);
      return { kind: 'owner' };
    }
    void stateMutationPromise
      .then(() => releaseStateMutation(normalizedKey))
      .catch((error) => {
        console.warn('[Kaira State Mutation] deferred non-owner release failed:', error);
      });
    return claim as KairaChatRequestClaim<T>;
  } catch (error) {
    await stateMutationPromise;
    console.warn('[Kaira Idempotency] distributed claim unavailable; using process-local fallback:', error);
    localFallbackKeys.add(normalizedKey);
    const claim = claimKairaChatRequest<T>(normalizedKey);
    if (claim.kind !== 'owner') await releaseStateMutation(normalizedKey);
    return claim;
  }
}

export async function releaseCoordinatedKairaChatStateMutation(key: string) {
  const normalizedKey = key.trim();
  if (!normalizedKey) return;
  await releaseStateMutation(normalizedKey);
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
  stateMutationHandles.clear();
  localStateTails.clear();
}
