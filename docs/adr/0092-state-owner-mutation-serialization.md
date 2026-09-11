# ADR 0092: State-owner mutation serialization

- Status: Accepted
- Date: 2026-09-10

## Context

The existing chat idempotency boundary is keyed by `stateOwner::instance::requestId`. It correctly deduplicates/replays the same request, but two distinct request IDs for the same persisted Kaira state owner can both become owners concurrently.

The KDM persistence path is read → canonical reduce → write. Without a state-owner concurrency boundary, two distinct requests can read the same persisted snapshot, compute two valid successor states independently, and allow the later write to erase the earlier turn (lost update).

A deterministic RED regression reproduced this failure with two different request IDs for the same state owner. Unrelated owners must remain parallel.

## Decision

Introduce a persistence-owned state mutation serialization boundary, separate from semantic interpretation and separate from request-id idempotency.

- The serialization key is the request key with the trailing request ID removed, so all mutations for the same Kaira state owner share one lock while unrelated owners do not.
- A Firestore transaction-backed lease is acquired before request idempotency ownership is established and is held through the request's load/reduce/persist lifecycle.
- The lease has an expiry and heartbeat renewal so abandoned owners can recover without a permanent lock.
- Completion and failure both release the state-owner lease.
- Same-request idempotency remains responsible for replay/deduplication; state-owner serialization is responsible only for cross-request mutation ordering.
- The canonical semantic/KDM/relationship reducers remain unchanged. This is a persistence/concurrency ownership seam, not a new behavioral authority.
- If the distributed lease backend is unavailable, the current implementation degrades to process-local keyed serialization. This preserves single-process ordering but does **not** claim cross-instance serialization during a Firestore outage.

## Ownership-loss contract

A live lease handle must not silently remain authoritative after the backend has rejected renewal.

- A heartbeat renewal returning `false` marks the lease locally as ownership-lost.
- The lease exposes `assertOwned()` as the fail-closed ownership check.
- `assertOwned()` performs an authoritative renewal check before persistence; a failed renewal throws `KairaStateMutationOwnershipLostError`.
- The chat coordinator retains the active lease assertion alongside the release function and exposes a request-scoped ownership assertion.
- Both local-language and provider/AI chat paths call that ownership assertion immediately before state persistence begins.
- A second owner may still recover the expired/lost lease according to the lease-expiry policy; the safety property is that the stale holder must fail before persisting, not that recovery waits for the stale process to release voluntarily.
- Process-local fallback has no distributed backend ownership to revalidate, so its assertion is a local no-op while its single-process keyed ordering guarantee remains unchanged.

This preserves crash recovery while preventing a stale holder from writing after authoritative lease ownership has been lost.

## Request identity scope

The production Studio chat client generates a request ID for each message, so its normal `/api/chat` traffic enters the coordinated state-owner boundary.

The server now also creates an internal namespaced operation identity for request-ID-less direct calls. That identity participates in state-owner serialization but does not fabricate a client replay identity or promise retry replay semantics.

## Consequences

- Distinct turns for one state owner are intentionally head-of-line serialized across healthy distributed instances.
- Different state owners continue in parallel.
- Lost-update risk from concurrent turns is removed at the mutation ownership seam instead of being patched in semantic or relationship code.
- Expired leases permit recovery after crashed owners.
- Backend-reported renewal loss is fail-closed before chat persistence starts.
- Distributed-backend outage has an explicitly weaker, process-local guarantee and must not be described as globally serialized.
- The ownership assertion is a persistence/concurrency guard only; it does not create a new semantic, relationship, behavior, or response authority.

## Proof

- Original serialization RED: Fast CI run #171 on commit `8b12455aa209ab294beab56c3ed0dacd1db8752d` demonstrated that two distinct request IDs for one state owner could both progress concurrently.
- Original serialization GREEN: Fast CI run #172 on commit `f6240488dd1337bb913263144acf1bc777b67b89` passed after the state-owner lease implementation and regression coverage.
- Regression also proves unrelated state owners are not serialized together.
- Ownership-loss RED: Fast CI #215 on commit `d1b65a94f023f6473cedf32b0658993167a0a778` failed because the active lease exposed no ownership assertion (`assertOwned` was undefined).
- Ownership-loss GREEN: Fast CI #218 on commit `d4b84d0d971daf9f3d16f4af0e2be6c2fc5c58fd` passed after fail-closed lease ownership propagation and pre-persistence verification; 52/52 focused tests passed and TypeScript validation passed.

## Acceptance gate

Any future change to lease recovery, expiry, heartbeat timing, or fencing semantics must preserve both sides of the contract:

1. crashed/stale owners remain recoverable; and
2. an owner that has lost authoritative lease ownership cannot begin persistence as if it still owned the state mutation critical section.
