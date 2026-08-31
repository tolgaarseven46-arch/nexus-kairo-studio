export type DistributedChatRecord<T = unknown> = {
  status: 'processing' | 'completed';
  ownerToken: string;
  leaseUntil: number;
  expiresAt: number;
  payload?: T;
};

export type DistributedClaim<T = unknown> =
  | { kind: 'owner'; ownerToken: string }
  | { kind: 'replay'; payload: T }
  | { kind: 'wait'; outcome: Promise<{ ok: true; payload: T } | { ok: false; errorMessage: string }> };

export interface DistributedChatIdempotencyBackend<T = unknown> {
  claim(input: {
    key: string;
    ownerToken: string;
    now: number;
    leaseMs: number;
    ttlMs: number;
  }): Promise<{ kind: 'owner' } | { kind: 'replay'; payload: T } | { kind: 'wait' }>;
  read(key: string): Promise<DistributedChatRecord<T> | null>;
  complete(input: {
    key: string;
    ownerToken: string;
    payload: T;
    now: number;
    ttlMs: number;
  }): Promise<void>;
  fail(input: { key: string; ownerToken: string }): Promise<void>;
}

const DEFAULT_LEASE_MS = 45_000;
const DEFAULT_TTL_MS = 2 * 60_000;
const DEFAULT_POLL_MS = 120;

function token(now = Date.now()) {
  return `owner_${now.toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function createDistributedChatIdempotency<T = unknown>(
  backend: DistributedChatIdempotencyBackend<T>,
  options: { leaseMs?: number; ttlMs?: number; pollMs?: number } = {},
) {
  const leaseMs = Math.max(5_000, options.leaseMs ?? DEFAULT_LEASE_MS);
  const ttlMs = Math.max(5_000, options.ttlMs ?? DEFAULT_TTL_MS);
  const pollMs = Math.max(20, options.pollMs ?? DEFAULT_POLL_MS);

  async function waitForOutcome(
    key: string,
    startedAt: number,
  ): Promise<{ ok: true; payload: T } | { ok: false; errorMessage: string }> {
    const deadline = startedAt + leaseMs + 5_000;
    while (Date.now() <= deadline) {
      const record = await backend.read(key);
      if (!record) return { ok: false, errorMessage: 'Distributed idempotency owner released the claim' };
      if (record.status === 'completed' && record.payload !== undefined) {
        return { ok: true, payload: record.payload };
      }
      if (record.status === 'processing' && record.leaseUntil <= Date.now()) {
        return { ok: false, errorMessage: 'Distributed idempotency lease expired' };
      }
      await sleep(pollMs);
    }
    return { ok: false, errorMessage: 'Distributed idempotency wait timed out' };
  }

  return {
    async claim(key: string, now = Date.now()): Promise<DistributedClaim<T>> {
      const normalizedKey = key.trim();
      const ownerToken = token(now);
      if (!normalizedKey) return { kind: 'owner', ownerToken };
      const claim = await backend.claim({ key: normalizedKey, ownerToken, now, leaseMs, ttlMs });
      if (claim.kind === 'owner') return { kind: 'owner', ownerToken };
      if (claim.kind === 'replay') return claim;
      return { kind: 'wait', outcome: waitForOutcome(normalizedKey, now) };
    },

    async complete(key: string, ownerToken: string, payload: T, now = Date.now()) {
      if (!key.trim()) return;
      await backend.complete({ key: key.trim(), ownerToken, payload, now, ttlMs });
    },

    async fail(key: string, ownerToken: string) {
      if (!key.trim()) return;
      await backend.fail({ key: key.trim(), ownerToken });
    },
  };
}
