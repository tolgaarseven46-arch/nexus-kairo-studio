# ADR-0020: How-are-you primary-intent stability

- Status: Accepted
- Date: 2026-09-04

## Context

After ADR-0019 was deployed, the same nine-family production smoke improved from 6/9 to 8/9. The only remaining live drift was `naber kaira`: the provider correctly emitted `target:kaira` and `socialRoutine:how_are_you`, but the model varied `primaryIntent` from the recorded canonical `greeting` contract to `smalltalk`.

ADR-0017 and `kairaSemanticProviderQualityMatrixContracts.test.ts` already define the canonical field pair for this routine as `primaryIntent:greeting + socialRoutine:how_are_you`. The smoke therefore exposed provider nondeterminism, not an overly strict acceptance test.

## Decision

Stabilize this field pair inside the semantic-provider boundary.

- The provider prompt explicitly states that `naber` / `nasılsın` use `primaryIntent:greeting + socialRoutine:how_are_you`.
- After schema normalization, `socialRoutine:how_are_you` deterministically normalizes `primaryIntent` to `greeting`.
- The invariant consumes only the provider's already-typed semantic field and never reparses raw text.

## Authority invariant

`SemanticInterpretation@2` remains the single semantic authority. This normalization is an intra-provider field-consistency rule, not downstream policy. KDM, relationship, dialogue, repetition, emotional-load and response planning remain unchanged.

## Verification

- Permanent regression: `kairaSemanticProviderLiveDriftRegression.test.ts` supplies a model output with `primaryIntent:smalltalk + socialRoutine:how_are_you` and requires canonical `primaryIntent:greeting`.
- The existing ADR-0017 nine-family matrix remains unchanged.
- Final acceptance requires the same deployed production nine-family smoke to pass 9/9.
