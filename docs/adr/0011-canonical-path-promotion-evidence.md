# ADR-0011: CANONICAL_PATH_PROMOTION_GATE evidence execution

- **Status:** Proposed
- **Date:** 2026-09-03
- **Parent:** ADR-0006

## Context

ADR-0006 forbids PR5 compatibility removal until `CANONICAL_PATH_PROMOTION_GATE` is satisfied. The gate is evidence-driven rather than time-driven and requires canonical beta acceptance, golden/drift stability, recorded-session replay, a verified rollback drill, and an explained canonical-vs-legacy behavior diff review.

PR #32 completed `UNIFIED_GUARD_PASS`; the next development step is therefore promotion evidence, not PR5.

## Decision

Add one repository-owned automated evidence runner, `scripts/run-canonical-path-promotion-evidence.mjs`, backed by `config/canonical-path-promotion-evidence.json`.

The runner executes three independent checks:

1. **Canonical beta acceptance:** the existing beta acceptance manifest with every ADR-0006 canonical flag explicitly ON.
2. **Recorded-session replay:** golden/foundation/runtime long-session and persistence fixtures with every canonical flag explicitly ON.
3. **Rollback drill:** a shared acceptance/persistence/long-session corpus with every canonical flag explicitly OFF, proving the legacy path remains executable and persisted state remains readable after the flip.

`.github/workflows/canonical-promotion-evidence.yml` executes the runner on pull requests and manual dispatch so the evidence is produced on a fresh checkout rather than inferred from local state.

## Important non-claim

This automation does **not** claim the full promotion gate is complete. The final requirement remains intentionally manual/evidence-review based:

- canonical-vs-legacy behavior diff review on the shared corpus,
- every observed delta must be classified as intentional or fixed,
- unexplained deltas block PR5.

Until that review is complete, canonical flags remain temporary and PR5 compatibility removal is forbidden.

## Rollback semantics

The drill explicitly writes all five canonical environment flags as `0`; it does not rely on missing environment variables. This prevents an inherited CI environment from accidentally exercising a mixed path while reporting a rollback success.

## Consequences

- Promotion evidence becomes reproducible and repository-owned.
- A green automated workflow closes only the automatable subset of the gate.
- PR5 remains blocked until the shared-corpus diff review is separately recorded and approved.
