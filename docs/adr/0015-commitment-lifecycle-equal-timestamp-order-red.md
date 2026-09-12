# ADR 0015 — Commitment lifecycle equal-timestamp order stability

Status: accepted; measured RED → narrow GREEN.

## Question
Can the same canonical lifecycle evidence multiset produce different current commitment truth solely because storage/input order differs when observations share the same valid timestamp?

## Measured RED
Yes. CI run `34721674972` passed docs/behavior guards, architecture/runtime/harness/replay gates and Historical RED→GREEN, then failed at the full `Tests` step. With one commitment-generation observation and one cancellation observation sharing the same proposition identity and identical valid `createdAt`, one input permutation resolved `planned` while the other resolved `cancelled`.

## Root cause
`compareObservationRecency()` correctly reports equal valid timestamps as equal recency. `resolvePlanLifecycle()` then used the stable sorted array order to choose the newest plan generation and its outcome window, allowing caller/storage order to become accidental temporal authority.

## Decision
When a selected plan-generation observation and a lifecycle outcome for the same proposition have the same valid timestamp, their temporal relation is not established. `resolvePlanLifecycle()` therefore fails closed to `unknown` and retains both evidence identities. It does not use observation ID, insertion order, or another synthetic tie-breaker to invent semantic time.

This is deliberately narrow:
- a strictly newer lifecycle outcome still closes the older plan generation;
- an older lifecycle outcome still cannot contaminate a strictly newer plan generation;
- the generic temporal comparator is unchanged;
- lifecycle/world-memory ownership remains unchanged.

## Regression proof
`worldEventLifecycleEqualTimestampOrderRegression.test.ts` locks both input permutations to the same fail-closed `unknown` result and separately protects the two neighboring distinct-timestamp lifecycle behaviors.

No provider/API calls are required.
