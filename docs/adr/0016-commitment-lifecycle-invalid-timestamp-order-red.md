# ADR 0016 — Commitment lifecycle invalid-timestamp order RED characterization

Status: characterization only; production behavior unchanged.

## Question
Can the same canonical commitment lifecycle evidence multiset produce different current truth solely because storage/input order differs when temporal ordering cannot be established because both observations have invalid timestamps?

## Expected invariant
No. Invalid temporal metadata must not make caller/storage order a semantic time authority. When current-generation order cannot be established, lifecycle truth should fail closed rather than vary by array order.

## Candidate failure
`compareObservationRecency()` correctly places invalid evidence behind valid evidence, but when both timestamps are invalid it returns `0`. `resolvePlanLifecycle()` only has an ambiguity guard for equal valid timestamps. Therefore two invalid-timestamp rows can preserve caller order through stable sort and produce different generation windows.

## Proof
`worldEventLifecycleEqualTimestampOrderRegression.test.ts` now supplies one commitment generation and one cancellation for the same proposition, both with invalid `createdAt`, then resolves both permutations. Both must fail closed to the same `unknown` truth while retaining the same evidence identities.

No production change and no provider/API call are part of this RED probe.
