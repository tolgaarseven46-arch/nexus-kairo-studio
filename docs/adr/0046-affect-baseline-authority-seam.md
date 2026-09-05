# ADR-0046 — Affect baseline is an explicit authority seam

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

Identity/Self Model characterization found that the runtime currently mixes stable affect homeostasis with situational reaction state.

Two distinct recovery semantics already exist:

1. Client temperament recovery decays existing `anger` / `stress` according to `recoverySpeed` and `attentionPersistence` before KDM.
2. Canonical `RelationshipReducer` performs per-turn affect homeostasis for `anger`, `stress`, `happiness` and `calmness` toward a reducer-local fixed constant `{10,20,70,70}`.

The fixed reducer constant is not instance-owned and cannot represent a future stable Kaira affect baseline. At the same time, changing the shipped numbers now would be speculative because the project has not yet defined which stable source — canonical identity, character configuration, temperament projection, or another explicit domain object — owns an instance-specific baseline.

## Decision

Introduce one typed `KairaAffectBaseline` authority seam for the four affect channels currently managed by RelationshipReducer homeostasis.

- `kairaAffectBaseline.ts` owns the canonical type, normalization and the shipped default `{ anger: 10, stress: 20, happiness: 70, calmness: 70 }`.
- `RelationshipReducerInput` accepts an optional `affectBaseline`.
- The reducer normalizes that input once and uses it for all four `towardBaseline(...)` calculations.
- When no caller supplies a baseline, the shipped default is identical to the previous reducer-local constant. Therefore this ADR changes ownership, not live behavior.
- The reducer no longer owns hard-coded baseline values.

## Non-decision

This ADR does **not** choose the future instance-owned source of affect baseline and does not reinterpret `temperament.arousalBaseline` as four resting affect values. `arousalBaseline` currently modulates event-response arousal; deriving anger/stress/happiness/calmness from it without a product model would be an invented mapping.

This ADR also does not remove the existing client temperament recovery. Whether client-side recovery and server-side affect homeostasis should be consolidated into one server-owned state-transition path is the next audit question.

## Consequences

- Baseline affect and situational affect now have a formal seam instead of an implicit reducer constant.
- Existing runtime behavior remains backward-compatible until an explicit owner supplies `affectBaseline`.
- Future instance-specific baselines can be wired without adding another homeostasis implementation inside RelationshipReducer.
- Invalid or out-of-range baseline values are normalized at one lightweight boundary.

## Regression coverage

- `kairaAffectBaseline.test.ts` locks shipped defaults and normalization.
- `kairaAffectBaselineAuthorityRegression.test.ts` proves default behavior is preserved and an explicitly supplied typed baseline becomes the sole homeostasis target.

## Next verified development question

Determine the correct **instance-owned source** of `KairaAffectBaseline` and audit whether the existing client `recoverTemperamentAffect(...)` step duplicates or conflicts with canonical server state transition. Do not derive a personalized baseline from temperament sliders until that ownership contract is proven.
