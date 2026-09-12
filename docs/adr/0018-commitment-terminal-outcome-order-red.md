# ADR 0018 — Commitment terminal-outcome order RED characterization

Status: characterization only; production behavior unchanged.

## Question
Can two conflicting lifecycle outcomes for the same current plan generation become different current truths solely because caller/storage order differs when their timestamps cannot establish an order?

## Expected invariant
No. Caller/storage order must not choose between conflicting terminal lifecycle truths. If two current-generation terminal outcomes are temporally indistinguishable, lifecycle resolution should fail closed instead of treating the first stable-sort row as authoritative.

## Candidate failure
`resolvePlanLifecycle()` sorts observations with `compareObservationRecency()` and then selects the first lifecycle signal inside the current generation. Equal valid timestamps compare as `0`, so stable sort may preserve caller order. Existing ambiguity checks cover plan-vs-plan and plan-vs-outcome ambiguity, but not outcome-vs-outcome conflict inside one generation.

## Proof
`worldEventLifecycleTerminalOutcomeOrderRegression.test.ts` supplies one older commitment plus simultaneous `executed` and `cancelled` outcomes in both permutations. Both permutations must resolve to the same fail-closed `unknown` truth and retain both conflicting evidence identities. A neighboring strictly newer terminal outcome must still win normally.

No production change and no provider/API call are part of this RED probe.
