# ADR 0017 — Commitment plan-generation order RED characterization

Status: characterization only; production behavior unchanged.

## Question
Can two plan/commitment observations for the same canonical proposition become different "newest generation" truths solely because caller/storage order differs when their timestamps cannot establish an order?

## Expected invariant
No. Caller/storage order must not choose semantic plan-generation identity. If multiple candidate plan generations are temporally indistinguishable, lifecycle resolution should fail closed instead of arbitrarily treating the first stable-sort row as the newest generation.

## Candidate failure
`resolvePlanLifecycle()` sorts observations with `compareObservationRecency()` and then chooses the first plan using `matching.find(...)`. Equal valid timestamps and pairs where both timestamps are invalid compare as `0`, so stable sort can preserve caller order. The existing ambiguity guard only compares the selected plan against lifecycle outcomes, not against another candidate plan generation.

## Proof
`worldEventLifecyclePlanGenerationOrderRegression.test.ts` supplies two plan generations for the same proposition in both permutations for two cases: equal valid timestamps and both-invalid timestamps. Both permutations must fail closed to the same `unknown` lifecycle truth and retain both plan evidence identities. A neighboring strictly newer valid plan must still resolve as `planned` with the newer generation selected.

No production change and no provider/API call are part of this RED probe.
