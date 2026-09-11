export interface KairaStateMutationBackend {
  acquire(input: { key: string; ownerToken: string; now: number; leaseMs: number }): Promise<boolean>;
  renew(input: { key: string; ownerToken: string; now: number; leaseMs: number }): Promise<boolean>;
  release(input: { key: string; ownerToken: string }): Promise<void>;
}

export class KairaStateMutationOwnershipLostError extends Error {
  constructor() {
    super('Kaira state-owner mutation lease ownership was lost');
    this.name = 'KairaStateMutationOwnershipLostError';
  }
}

export interface KairaStateMutationLease {
  ownerToken: string;
  assertOwned: () => Promise<void>;
  release: () => Promise<void>;
}

const DEFAULT_LEASE_MS = 90_000;
const DEFAULT_WAIT_MS = 120_000;
const DEFAULT_POLL_MS = 60;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function ownerToken(now = Date.now()) {
  return `state_${now.toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function createDistributedStateMutationCoordinator(
  backend: KairaStateMutationBackend,
  options: { leaseMs?: number; waitMs?: number; pollMs?: number } = {},
) {
  const leaseMs = Math.max(10_000, options.leaseMs ?? DEFAULT_LEASE_MS);
  const waitMs = Math.max(10_000, options.waitMs ?? DEFAULT_WAIT_MS);
  const pollMs = Math.max(20, options.pollMs ?? DEFAULT_POLL_MS);

  return {
    async acquire(key: string): Promise<KairaStateMutationLease> {
      const normalizedKey = key.trim();
      if (!normalizedKey) {
        return {
          ownerToken: '',
          assertOwned: async () => undefined,
          release: async () => undefined,
        };
      }
      const token = ownerToken();
      const deadline = Date.now() + waitMs;

      while (Date.now() <= deadline) {
        const now = Date.now();
        if (await backend.acquire({ key: normalizedKey, ownerToken: token, now, leaseMs })) {
          let released = false;
          let renewing = false;
          let ownershipLost = false;
          const markOwnershipLost = () => {
            ownershipLost = true;
          };
          const renewAuthoritatively = async () => {
            if (released || ownershipLost) throw new KairaStateMutationOwnershipLostError();
            const renewed = await backend.renew({
              key: normalizedKey,
              ownerToken: token,
              now: Date.now(),
              leaseMs,
            });
            if (!renewed) {
              markOwnershipLost();
              throw new KairaStateMutationOwnershipLostError();
            }
          };
          const renewEveryMs = Math.max(5_000, Math.floor(leaseMs / 3));
          const timer = setInterval(async () => {
            if (released || ownershipLost || renewing) return;
            renewing = true;
            try {
              await renewAuthoritatively();
            } catch (error) {
              if (error instanceof KairaStateMutationOwnershipLostError) {
                clearInterval(timer);
                console.warn('[Kaira State Mutation] lease ownership lost');
              } else {
                console.warn('[Kaira State Mutation] lease renewal failed:', error);
              }
            } finally {
              renewing = false;
            }
          }, renewEveryMs);
          (timer as any).unref?.();

          return {
            ownerToken: token,
            assertOwned: renewAuthoritatively,
            release: async () => {
              if (released) return;
              released = true;
              clearInterval(timer);
              await backend.release({ key: normalizedKey, ownerToken: token });
            },
          };
        }
        await sleep(pollMs);
      }

      throw new Error('Timed out waiting for Kaira state-owner mutation lease');
    },
  };
}
