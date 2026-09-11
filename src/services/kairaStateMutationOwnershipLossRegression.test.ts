import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDistributedStateMutationCoordinator,
  type KairaStateMutationBackend,
} from './kairaDistributedStateMutation';

afterEach(() => {
  vi.useRealTimers();
});

describe('Kaira state mutation lease ownership-loss regression', () => {
  it('does not hand the same state owner to a second caller while the first caller still has an unreleased lease handle', async () => {
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
          // Simulate authoritative lock loss between heartbeats: deletion,
          // administrative recovery, or another backend-side ownership change.
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

    // The first heartbeat loses authoritative ownership. The caller has not
    // released its lease handle and receives no ownership-loss signal.
    await vi.advanceTimersByTimeAsync(5_000);

    let secondResolved = false;
    const secondPromise = coordinator.acquire('kaira_default:user_a').then((lease) => {
      secondResolved = true;
      return lease;
    });
    await vi.advanceTimersByTimeAsync(25);

    // Safety invariant: while caller A still holds an unreleased lease handle,
    // caller B must not be allowed to enter the same state-owner critical section.
    expect(secondResolved).toBe(false);

    await first.release();
    await vi.advanceTimersByTimeAsync(25);
    const second = await secondPromise;
    await second.release();
  });
});
