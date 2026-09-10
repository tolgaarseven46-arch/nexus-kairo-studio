# ADR 0093 — RequestId-less chat coordination identity

## Status
Accepted — 2026-09-10

## Context
PR #206 introduced state-owner mutation serialization by deriving the state-owner lease key from the coordinated chat request key. Normal Studio traffic supplies an external `requestId`, so those turns enter both request replay/deduplication and state-owner serialization.

The `/api/chat` contract still allowed callers to omit `requestId`. Those turns therefore skipped `claimCoordinatedKairaChatRequest`, bypassing the state-owner lease and reopening the same lost-update class for direct API callers.

The missing external request ID must not be treated as if the server can recreate client retry identity. A server-generated ID can safely identify one execution for serialization, but it cannot make a later network retry replay the original result.

## Decision
Every `/api/chat` execution receives a coordination identity before state mutation begins.

- When an external `requestId` is present, it remains the coordination identity and retains the existing replay/deduplication contract.
- When `requestId` is absent, the server creates a namespaced internal operation identity (`internal:<uuid>`).
- The internal identity is intentionally non-replayable from the caller's perspective. It exists only so the turn enters the same state-owner mutation serialization seam.
- The response continues to omit `requestId` when the caller did not provide one; the server does not pretend an external retry contract exists.
- Success and failure release the same coordination claim.
- No semantic, relationship, memory, appraisal, or response authority changes.

## Consequences
Distinct requestId-less turns for the same state owner are serialized instead of concurrently reducing from the same persisted snapshot. Different state owners remain parallel through the existing owner-scoped lease implementation.

Clients that require retry replay must still provide a stable external `requestId`. Internal operation identity prevents lost updates but does not deduplicate separate HTTP retries that omitted request identity.

## Verification
- Historical RED: `bf2a12a5bcbd893241327fe415640c493bd95650` / Fast CI #185 failed because the request coordination identity boundary did not exist.
- Focused identity tests distinguish replayable external IDs from non-replayable internal IDs and prove two requestId-less turns receive distinct coordination identities.
- `kairaChatRequestCoordinationNeighborProofRegression.test.ts` carries the reported case, two neighboring requestId-less variants, and the external-requestId counterexample required by the bug-reduction protocol.
- `config/behavior-regression-proof.json` registers the same bug class against the historical RED SHA.
- Server wiring regression proves `/api/chat` no longer gates state-owner coordination on external `requestId` presence and releases the same coordination key on success/failure.
- Full CI and Architecture Review are required before merge.
