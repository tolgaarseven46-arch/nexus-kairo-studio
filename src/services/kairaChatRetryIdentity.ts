import type { DroitDynamicState } from '../types/nexus';

const RETRY_ID_TTL_MS = 2 * 60 * 1000;

type PendingRetryIdentity = {
  requestId: string;
  expiresAt: number;
};

const pending = new Map<string, PendingRetryIdentity>();

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
}

function stateRevision(state?: DroitDynamicState) {
  const relationship = state?.relationship;
  return [
    relationship?.interactionCount ?? 0,
    relationship?.lastInteractionAt ?? '',
    relationship?.conversationState ?? '',
    relationship?.hurtScore ?? 0,
    relationship?.conflictScore ?? 0,
    state?.reactionMode ?? '',
  ].join('|');
}

export function buildKairaChatRetryFingerprint(input: {
  userId: string;
  kairaInstanceId: string;
  userMessage: string;
  dynamicState?: DroitDynamicState;
}) {
  return [
    input.userId.trim(),
    input.kairaInstanceId.trim(),
    normalizeText(input.userMessage),
    stateRevision(input.dynamicState),
  ].join('::');
}

function newRequestId() {
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return `kaira_${cryptoApi.randomUUID()}`;
  }
  return `kaira_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function prune(now: number) {
  for (const [fingerprint, item] of pending) {
    if (item.expiresAt <= now) pending.delete(fingerprint);
  }
}

export function acquireKairaChatRequestIdentity(
  fingerprint: string,
  now = Date.now(),
) {
  prune(now);
  const existing = pending.get(fingerprint);
  if (existing) return existing.requestId;
  const requestId = newRequestId();
  pending.set(fingerprint, { requestId, expiresAt: now + RETRY_ID_TTL_MS });
  return requestId;
}

export function completeKairaChatRequestIdentity(fingerprint: string) {
  pending.delete(fingerprint);
}

export function clearKairaChatRetryIdentityForTests() {
  pending.clear();
}
