# ADR 0017 — Commitment plan-generation temporal ambiguity

Status: implemented.

## Question
Can two plan/commitment observations for the same canonical proposition become different "newest generation" truths solely because caller/storage order differs when their timestamps cannot establish an order?

## Decision
No. Caller/storage order must not choose semantic plan-generation identity. If multiple candidate plan generations are temporally indistinguishable, lifecycle resolution fails closed to `unknown` and preserves all ambiguous plan evidence identities.

The rule is deliberately local to `resolvePlanLifecycle()`. `compareObservationRecency()` continues to return `0` when temporal evidence cannot establish order; the lifecycle resolver must interpret that as ambiguity rather than silently using stable-sort input order as semantic time authority.

A valid timestamp still outranks invalid timestamp evidence under the existing temporal policy, and a strictly newer valid plan generation remains authoritative even if older plan generations are mutually ambiguous.

## Failure mechanism
`resolvePlanLifecycle()` previously sorted observations with `compareObservationRecency()` and then chose the first plan using `matching.find(...)`. Equal valid timestamps and pairs where both timestamps are invalid compare as `0`, so stable sort could preserve caller order. The prior ambiguity guard only compared the selected plan against lifecycle outcomes, not against another candidate plan generation.

## Implementation
Before assigning lifecycle authority to the newest candidate plan, the resolver now checks whether any competing plan candidate is temporally indistinguishable from it:

- same valid timestamp → ambiguous;
- both timestamps invalid → ambiguous;
- valid versus invalid → not ambiguous; existing valid-first temporal policy applies;
- strictly different valid timestamps → newest valid plan remains authoritative.

When ambiguity exists, resolution returns `unknown` without assigning a generation identity and retains the ambiguous plan observation IDs as evidence.

## Proof
`worldEventLifecyclePlanGenerationOrderRegression.test.ts` covers:

- equal valid timestamp plan-generation permutations;
- both-invalid timestamp plan-generation permutations;
- strictly newer valid neighboring control;
- valid plan evidence outranking invalid plan evidence;
- an older ambiguous pair not hiding a strictly newer valid plan.

No provider/API calls are involved.
