# ADR-0040 — Proposal semantic correlation identity

- Status: Accepted for production repair
- Date: 2026-09-04

## Context

After the proposal-recovery reclaim persistence fix reached production, the expired recovery lease could be reclaimed successfully, but materialization still failed with `Kaira activity proposal correlation mismatch`.

The proposal store compared the canonical proposal identity using `JSON.stringify` over nested `selected` maps. Firestore does not preserve JavaScript object property insertion order as a semantic contract, so the same logical proposal can be hydrated with a different nested map-key order and be rejected as drift.

## Decision

Proposal idempotency and materialization correlation compare canonical semantic content rather than raw object key insertion order:

1. Object keys are recursively sorted before serialization.
2. Array order remains significant and is not reordered.
3. `instanceType`, `proposalId`, and the full selected proposal semantics remain part of correlation identity.
4. A real value change still fails closed as an idempotency/correlation conflict.

## Invariants

- Firestore map-key ordering cannot create a false proposal correlation failure.
- Real planning-semantic drift remains rejected.
- Proposal document identity, execution authority, schedule authority, and materialization ordering remain unchanged.
- Production acceptance requires the previously stuck selected proposal to recover/materialize with `failed = 0`, followed by a fresh autonomous-life tick with planning/recovery/schedules failures all zero.

## Verification

Permanent regression: `src/services/kairaActivityProposalStoreContracts.test.ts` locks Firestore-style nested map-key reordering while retaining the existing semantic-drift rejection test.
