import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDistributedStateMutationCoordinator,
  type KairaStateMutationBackend,
} from './kairaDistributedStateMutation';

afterEach(() => {
  vi.useRealTimers();
});

describe('Kaira state mutation lease ownership-loss regression', () => {
  it('makes authoritative renewal loss observable to the active holder without blocking crash recovery', async () => {
    vi.useFakeTimers();

    let backendOwner: string | null = null;
    let firstOwnerToken: string | null = null;
    let firstRenewal = true;

    const backend: KairaStateMutationBackend = {
      async acquire({ ownerToken }) {
        if (backendOwner === null || backendOwner === ownerToken) {
          backendOwner = ownerToken;
          firstOwnerToken ??= ownerToken;
          return true;
        }
        return false;
      },
      async renew({ ownerToken }) {
        if (ownerToken !== backendOwner) return false;
        if (ownerToken === firstOwnerToken && firstRenewal) {
          firstRenewal = false;
          // Simulate authoritative ownership loss between heartbeats.
          backendOwner = null;
          return false;
        }
        return true;
      },
      async release({ ownerToken }) {
        if (backendOwner === ownerToken) backendOwner = null;
      },
    };

    const coordinator = createDistributedStateMutationCoordinator(backend, {
      leaseMs: 10_000,
      waitMs: 10_000,
      pollMs: 20,
    });

    const first = await coordinator.acquire('kaira_default:user_a');

    // Heartbeat reaches an authoritative `false`: this process no longer owns
    // the distributed state mutation lease.
    await vi.advanceTimersByTimeAsync(5_000);

    // Crash recovery must remain possible; another caller can become owner.
    const second = await coordinator.acquire('kaira_default:user_a');
    expect(second.ownerToken).not.toBe(first.ownerToken);

    // The stale holder must have an explicit fail-closed ownership check before
    // it is allowed to perform persistence. Current production exposes only
    // `ownerToken` + `release`, so this assertion is the intended RED contract.
    expect(typeof (first as any).assertOwned).toBe('function');
    await expect((first as any).assertOwned()).rejects.toThrow(/ownership|lease/i);

    await first.release();
    await second.release();
  });
});
