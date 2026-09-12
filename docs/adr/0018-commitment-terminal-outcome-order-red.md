# ADR 0018 — Commitment terminal-outcome order resolution

Status: implemented; measured RED → GREEN.

## Question
Can two conflicting lifecycle outcomes for the same current plan generation become different current truths solely because caller/storage order differs when their timestamps cannot establish an order?

## Decision
No. Caller/storage order is not lifecycle authority. Within the current plan generation, if the latest temporal bucket contains different terminal lifecycle states and those observations are temporally indistinguishable, `resolvePlanLifecycle()` fails closed to `unknown` and retains the conflicting evidence identities.

The rule is intentionally narrow:
- same-state duplicate terminal observations do not become ambiguous;
- an older ambiguous bucket does not poison a strictly newer definitive outcome;
- normal strictly newer terminal evidence still wins;
- `compareObservationRecency()` remains unchanged and no insertion-order or observation-ID tie-break becomes semantic time authority.

## RED proof
`worldEventLifecycleTerminalOutcomeOrderRegression.test.ts` supplied one older commitment plus simultaneous `executed` and `cancelled` outcomes in both permutations. Before the fix, stable-sort caller order selected different lifecycle truth and full `Tests` failed after all deterministic pre-gates and Historical RED→GREEN had passed.

## GREEN proof
The resolver now inspects only the latest lifecycle-outcome temporal bucket inside the current generation. Conflicting kinds in that bucket resolve to `unknown`; same-kind duplicates and older ambiguous buckets are covered by neighboring regression controls. Full CI and Architecture Review are required before merge.

No provider/API change and no new semantic authority are introduced.
