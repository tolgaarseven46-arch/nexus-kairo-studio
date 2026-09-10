export interface KairaStateMutationBackend {
  acquire(input: { key: string; ownerToken: string; now: number; leaseMs: number }): Promise<boolean>;
  renew(input: { key: string; ownerToken: string; now: number; leaseMs: number }): Promise<boolean>;
  release(input: { key: string; ownerToken: string }): Promise<void>;
}

export interface KairaStateMutationLease {
  ownerToken: string;
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
      if (!normalizedKey) return { ownerToken: '', release: async () => undefined };
      const token = ownerToken();
      const deadline = Date.now() + waitMs;

      while (Date.now() <= deadline) {
        const now = Date.now();
        if (await backend.acquire({ key: normalizedKey, ownerToken: token, now, leaseMs })) {
          let released = false;
          let renewing = false;
          const renewEveryMs = Math.max(5_000, Math.floor(leaseMs / 3));
          const timer = setInterval(async () => {
            if (released || renewing) return;
            renewing = true;
            try {
              await backend.renew({ key: normalizedKey, ownerToken: token, now: Date.now(), leaseMs });
            } catch (error) {
              console.warn('[Kaira State Mutation] lease renewal failed:', error);
            } finally {
              renewing = false;
            }
          }, renewEveryMs);
          (timer as any).unref?.();

          return {
            ownerToken: token,
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
