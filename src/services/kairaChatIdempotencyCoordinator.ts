import {
  claimKairaChatRequest,
  completeKairaChatRequest,
  failKairaChatRequest,
  type KairaChatRequestClaim,
} from './kairaChatIdempotency';
import { createDistributedChatIdempotency } from './kairaDistributedChatIdempotency';
import { firestoreChatIdempotencyBackend } from './kairaFirestoreChatIdempotency';

const distributed = createDistributedChatIdempotency<any>(firestoreChatIdempotencyBackend);
const distributedOwners = new Map<string, string>();
const localFallbackKeys = new Set<string>();

export async function claimCoordinatedKairaChatRequest<T = unknown>(key: string): Promise<KairaChatRequestClaim<T>> {
  const normalizedKey = key.trim();
  if (!normalizedKey) return { kind: 'owner' };
  try {
    const claim = await distributed.claim(normalizedKey);
    if (claim.kind === 'owner') {
      distributedOwners.set(normalizedKey, claim.ownerToken);
      localFallbackKeys.delete(normalizedKey);
      return { kind: 'owner' };
    }
    return claim as KairaChatRequestClaim<T>;
  } catch (error) {
    console.warn('[Kaira Idempotency] distributed claim unavailable; using process-local fallback:', error);
    localFallbackKeys.add(normalizedKey);
    return claimKairaChatRequest<T>(normalizedKey);
  }
}

export async function completeCoordinatedKairaChatRequest<T = unknown>(key: string, payload: T) {
  const normalizedKey = key.trim();
  if (!normalizedKey) return;
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
}

export async function failCoordinatedKairaChatRequest(key: string, error: unknown) {
  const normalizedKey = key.trim();
  if (!normalizedKey) return;
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
}

export function clearCoordinatedKairaChatIdempotencyForTests() {
  distributedOwners.clear();
  localFallbackKeys.clear();
}
