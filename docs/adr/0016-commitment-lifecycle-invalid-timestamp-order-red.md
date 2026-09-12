# ADR 0016 — Commitment lifecycle invalid-timestamp ambiguity

Status: accepted.

## Decision
Commitment lifecycle truth must not depend on caller/storage order when temporal ordering cannot be established. If the selected plan generation and a lifecycle outcome both carry invalid timestamps, the lifecycle resolver fails closed to `unknown` and preserves the relevant evidence identities.

This is intentionally lifecycle-local. `compareObservationRecency()` remains unchanged and does not become semantic authority. A mixed valid/invalid pair is not treated as this ambiguity class; the existing valid-over-invalid temporal policy remains intact.

## Measured RED
CI run `34722582940` proved the failure. Behavior/docs guards, architecture/runtime/harness/replay gates, proof-manifest validation and Historical RED→GREEN were all green; full `Tests` failed on the new invalid-timestamp permutation invariant.

Root cause: when both timestamps were invalid, `compareObservationRecency()` returned `0`; stable sort could preserve caller order. The earlier equal-valid-timestamp guard did not cover this case, so the generation window could vary by storage order.

## Narrow GREEN
`resolvePlanLifecycle()` now treats a lifecycle outcome as temporally ambiguous with the selected plan when either:

1. both timestamps are valid and exactly equal; or
2. both timestamps are invalid and therefore cannot be ordered.

Ambiguous lifecycle evidence resolves to `unknown`; plan/outcome evidence IDs are retained. No observation ID or insertion-order tie-breaker is introduced. Strictly ordered valid timestamps preserve their existing behavior.

Regression coverage includes both invalid-timestamp permutations, the existing equal-valid-timestamp permutations, and neighboring strictly newer/older lifecycle behavior.

No provider/API call is part of this change.
