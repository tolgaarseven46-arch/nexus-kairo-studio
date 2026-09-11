# ADR-0094: Bound state-mutation lease clock skew

## Status
Accepted for implementation on `codex/state-lease-clock-skew-red`.

## Context
The distributed state-owner mutation lock introduced in ADR-0092 stores a numeric `leaseUntil` and compares it with the caller instance's wall-clock `now`. Firestore transactions serialize writes, but they do not provide an authoritative server `now` that can be synchronously compared with an already stored numeric deadline inside the same transaction.

A deterministic production-backend regression proved the consequence: holder A can acquire a fresh lease and holder B, observing the same real instant with a wall clock sufficiently ahead, can treat A's lease as expired and acquire the same state-owner lock. Historical RED commit: `d736ae5934106d83f13b3f13ef92a34f56bddd09`; Fast CI #208 failed only on the new assertion (`expected true to be false`).

## Decision
Treat bounded forward wall-clock disagreement as lease-expiry uncertainty.

`firestoreStateMutationBackend.acquire` must not transfer a lock to a different owner until:

`now > existing.leaseUntil + STATE_MUTATION_LEASE_CLOCK_SKEW_TOLERANCE_MS`

The initial tolerance is 30 seconds.

This preserves crash recovery while making the lease contract explicit about the amount of tolerated inter-instance wall-clock disagreement. A neighbor regression must also prove that takeover remains possible after the original lease deadline plus the tolerance has elapsed.

## Consequences
- A contender up to 30 seconds ahead cannot steal a freshly expired-looking lease from the current holder.
- Crash recovery can be delayed by at most the additional 30-second tolerance beyond the stored lease deadline.
- This is a bounded-skew safety policy, not a claim of arbitrary-clock correctness.
- Heartbeat ownership-loss propagation remains a separate concern: a holder whose `renew` returns `false` still needs an independent measured failure proof before any broader fencing/abort design is introduced.
- No semantic, relationship, memory, or response authority changes are introduced.
