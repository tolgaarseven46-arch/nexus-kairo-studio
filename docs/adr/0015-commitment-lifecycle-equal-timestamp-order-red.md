# ADR 0015 — Commitment lifecycle equal-timestamp order RED characterization

Status: characterization only; production behavior unchanged.

## Question
Can the same canonical lifecycle evidence multiset produce different current commitment truth solely because storage/input order differs when observations share the same valid timestamp?

## Expected invariant
No. Durable world-memory truth must not depend on array/storage order. This characterization intentionally does not decide whether an exactly simultaneous commitment + cancellation should resolve to planned, cancelled, or fail-closed unknown; it only requires permutation stability for the same evidence.

## Candidate failure
`compareObservationRecency()` returns `0` when valid timestamps are equal. `resolvePlanLifecycle()` then uses sorted array order to choose the newest plan generation and its outcome window. Stable sort can therefore preserve caller order and let storage order affect lifecycle truth.

## Proof
`worldEventLifecycleEqualTimestampOrderRegression.test.ts` supplies one commitment-generation observation and one cancellation observation with the same canonical proposition identity and identical `createdAt`, then resolves both permutations. State, generation anchor and evidence identity must be permutation-stable.

No production change and no provider/API call are part of this RED probe.
