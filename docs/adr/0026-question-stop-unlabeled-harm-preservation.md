# ADR-0026: Preserve unlabeled canonical harm on question-only stops

## Status
Accepted

## Context
ADR-0025 made a pure `stopQuestions=true`, `stopTalking=false`, `stopRequest=false` turn relationship-neutral so a request such as `soru sorma artık` would not create conflict/hurt merely because the semantic provider projected low negative noise.

Production smoke after PR #50 exposed the opposite edge case: `salak, soru sorma artık` was returned by the canonical provider with `stopQuestions=true` and meaningful typed severity (`disrespect=0.3`) but without an `insult` label. The ADR-0025 suppression therefore erased real relationship harm.

## Decision
Question-only stop suppression may apply only when both conditions hold:

1. there is no independent typed harm act/intention; and
2. every canonical severity-vector component is below the RelationshipReducer harm floor (`0.15`).

The decision consumes only `SemanticInterpretation@2` fields. It does not inspect raw text and does not add a second semantic parser.

## Consequences
- Pure question suppression remains relationship-neutral even when the provider adds small severity noise below the existing reducer harm floor.
- A combined command with meaningful canonical severity remains relationship-affecting even when the provider omits a categorical insult/social-act label.
- The threshold is aligned with the existing RelationshipReducer present-harm authority instead of introducing a separate behavior threshold.
- Regression coverage must include both the pure-stop and unlabeled-harm counterexamples.
