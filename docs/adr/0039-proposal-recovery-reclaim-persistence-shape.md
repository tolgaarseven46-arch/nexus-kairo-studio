# ADR-0039 — Proposal recovery reclaim persistence shape

- Status: Accepted for production repair
- Date: 2026-09-04

## Context

After PR #70 fixed autonomous planning-trigger semantic idempotency, a fresh production wakeup completed all 25 planning items but proposal recovery still reported one failed selected proposal. A one-time production diagnostic reproduced the exact error: Firestore rejected `undefined` values written to `completedAt` and `outcome` while reclaiming an expired proposal-recovery lease.

The recovery receipt schema models `completedAt` and `outcome` as terminal-only optional fields. Reclaiming a receipt transitions it back to active `claimed` state, so terminal-only fields must be absent, not present with JavaScript `undefined` values.

## Decision

When reclaiming an expired `kairaActivityProposalRecovery` receipt:

1. Preserve canonical identity fields and existing durable metadata.
2. Set `status` to `claimed` and refresh `claimedAt` / `leaseUntil`.
3. Omit `completedAt` and `outcome` from the persisted object entirely.
4. Do not enable Firestore `ignoreUndefinedProperties` as a global workaround; persistence shape remains explicit at the recovery authority.

## Invariants

- Firestore writes never contain `undefined` terminal-only recovery fields.
- Completed/replayed recovery semantics remain unchanged.
- Recovery identity and lease ownership remain unchanged.
- A reclaim does not retain stale terminal outcome metadata.
- Production acceptance requires a fresh autonomous-life wakeup after exact-commit deployment with `recovery.failed = 0`.

## Verification

Permanent regression: `src/services/kairaActivityProposalRecoveryStore.test.ts`.
