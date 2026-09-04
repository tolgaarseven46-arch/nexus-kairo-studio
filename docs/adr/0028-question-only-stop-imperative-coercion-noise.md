# ADR-0028: Question-only stop imperative coercion noise

- Status: Accepted
- Date: 2026-09-04

## Context

Live production diagnostics after PR #52 showed that the canonical semantic provider consistently represents the pure request `soru sorma artık` as a question-only stop with `primaryIntent=command`, `stopQuestions=true`, `stopTalking=false`, `stopRequest=false`, but also emits `coercion=0.3` because the phrase is imperative. That coercion component is structural command tone rather than independent relationship harm.

The same live diagnostic distinguishes `salak, soru sorma artık` through independent harm evidence: `disrespect=0.3..0.4` and, in some samples, an explicit `insult` social act. Therefore treating coercion severity by itself as relationship injury for this specific discourse shape over-penalizes an otherwise valid preference/boundary request.

## Decision

At RelationshipReducer ingress, a canonical question-only stop is relationship-neutral when:

- `stopQuestions=true`,
- `stopTalking=false`,
- `stopRequest=false`,
- there is no independent harm intent/social act,
- and `disrespect`, `manipulation`, and `privacy` are all below the existing relationship harm floor (`0.15`).

For this discourse shape only, coercion/aggression severity alone is treated as imperative-tone noise. Explicit typed `coercion` social acts remain independent harm and are never suppressed. Disrespect/manipulation/privacy severity at or above the harm floor also remains authoritative.

## Authority invariant

No raw-text reparsing is added. The projection consumes only immutable `SemanticInterpretation@2` fields. The semantic provider remains the canonical producer; this ADR only defines how one typed discourse shape is projected into dyadic relationship injury.

## Verification

- Regression: `src/services/kairaQuestionOnlyStopRelationshipPolicyRegression.test.ts`.
- Production evidence: repeated `/api/language-understanding` samples for `soru sorma artık` and `salak, soru sorma artık` on 2026-09-04.
- Required validation: architecture contracts, autonomous runtime contracts, beta gates, full tests, TypeScript, production build, Architecture Review, then live `/api/chat` smoke for both counterexamples.
