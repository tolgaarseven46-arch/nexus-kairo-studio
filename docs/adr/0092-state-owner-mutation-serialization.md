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

## Request identity scope

The production Studio chat client generates a request ID for each message, so its normal `/api/chat` traffic enters the coordinated state-owner boundary.

The server currently treats `requestId` as optional. A direct caller that omits it bypasses the idempotency coordinator and therefore also bypasses this state-owner lease. This ADR does not pretend otherwise: server-side request identity enforcement/generation requires its own contract decision because silently generating an identity changes the public API's retry/idempotency semantics. Until that contract is changed, the serialization guarantee applies to request-ID-bearing chat traffic.

## Consequences

- Distinct turns for one state owner are intentionally head-of-line serialized across healthy distributed instances.
- Different state owners continue in parallel.
- Lost-update risk from concurrent request-ID-bearing turns is removed at the mutation ownership seam instead of being patched in semantic or relationship code.
- Expired leases permit recovery after crashed owners.
- Distributed-backend outage has an explicitly weaker, process-local guarantee and must not be described as globally serialized.
- Direct request-ID-less API traffic remains a documented residual contract gap rather than an implicit guarantee.

## Proof

- RED: Fast CI run #171 on commit `8b12455aa209ab294beab56c3ed0dacd1db8752d` demonstrated that two distinct request IDs for one state owner could both progress concurrently.
- GREEN: Fast CI run #172 on commit `f6240488dd1337bb913263144acf1bc777b67b89` passed after the state-owner lease implementation and regression coverage.
- Regression also proves unrelated state owners are not serialized together.

## Follow-up acceptance gate

Before expanding the guarantee to request-ID-less direct API calls, define and test the server contract explicitly: either require a client request ID or establish a server-owned mutation identity that does not falsely promise retry replay semantics. The chosen path must first be demonstrated with a failing contract test.
