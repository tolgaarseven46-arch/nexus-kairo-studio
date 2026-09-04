# ADR-0029: Question-only stop as dyadic target evidence

- Status: Accepted
- Date: 2026-09-04

## Context

After PR #53, live production smoke proved that the pure request `soru sorma artık` is relationship-neutral, but the counterexample `salak, soru sorma artık` still failed to create relationship injury. Canonical diagnostics showed why: the semantic provider sometimes emits `target=unknown` for the combined message even while preserving meaningful `disrespect` severity.

The RelationshipReducer bridge previously treated a turn as dyadic only when `SemanticInterpretation@2.target === "kaira"`. As a result, preserved harm severity was discarded by the reducer because `targetsKaira=false`.

A typed question-only stop already encodes an interlocutor-directed conversational preference: `stopQuestions=true`, `stopTalking=false`, `stopRequest=false`. This is sufficient dyadic-target evidence unless grounding explicitly scopes the event to a third party or an external event.

## Decision

At RelationshipReducer ingress, treat a canonical question-only stop as addressed to Kaira when:

- `stopQuestions=true`,
- `stopTalking=false`,
- `stopRequest=false`,
- `relationshipScope` is neither `third_party` nor `event`.

The existing explicit `target="kaira"` path remains valid. Third-party and event scopes remain authoritative exclusions.

## Safety interaction

This target projection does not itself create injury. The question-only stop relationship policy still zeroes severity and negative pattern for a pure preference request, so `soru sorma artık` remains neutral. If the same message also carries independent harm such as `disrespect >= 0.15`, that severity remains intact and the now-correct dyadic target allows RelationshipReducer to apply the injury.

## Authority invariant

No raw-text parsing is added. The bridge consumes only immutable `SemanticInterpretation@2` facets plus grounded relationship scope. Semantic ingestion remains the sole classification authority.

## Verification

- Structural wiring regression: `src/services/kairaQuestionOnlyStopDyadicTargetWiringRegression.test.ts`.
- Canonical runtime regression: `src/services/kairaQuestionOnlyStopCanonicalRuntimeRegression.test.ts` executes the real `analyzeKdmInteractionCanonicalTurn` wiring with provider `target=unknown` and locks both sides of the boundary:
  - pure `soru sorma artık` produces no relationship injury;
  - `salak, soru sorma artık` with preserved disrespect produces relationship injury.
- Existing policy regression continues to verify pure-stop neutralization and independent-harm preservation.
- Required validation: architecture contracts, autonomous runtime contracts, beta gates, full tests, TypeScript, production build, Architecture Review, and live `/api/chat` smoke for both `soru sorma artık` and `salak, soru sorma artık`.
