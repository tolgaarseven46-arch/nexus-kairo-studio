# ADR-0027: Ignore aggression-only provider noise for question-only stops

## Status
Accepted

## Context
PR #51 preserved meaningful canonical severity when the semantic provider omitted an explicit insult label. Production smoke then showed that a pure `soru sorma artık` can itself receive elevated aggregate/aggression severity from the provider while still carrying only `disrespect=0..0.1` and no independent harm act. Treating any severity-vector component above the generic harm floor as independent relationship harm therefore reintroduced the original false injury.

The same smoke evidence still distinguishes the real combined counterexample: `salak, soru sorma artık` carries meaningful `disrespect` (observed `0.3`).

## Decision
For the narrow `stopQuestions=true`, `stopTalking=false`, `stopRequest=false` policy only:

- categorical typed harm acts/intents remain authoritative;
- `disrespect`, `coercion`, `manipulation`, and `privacy` at or above `0.15` remain authoritative relationship harm;
- `aggression` alone is not sufficient to defeat question-only neutrality, because imperative phrasing can raise it without a dyadic injury act.

This is a projection policy at RelationshipReducer ingress, not a semantic rewrite. Raw text is never reparsed.

## Consequences
- Pure requests to stop asking questions do not create conflict/hurt merely because the provider reads imperative tone as aggression.
- Insults and other independent typed harms remain relationship-affecting, including unlabeled cases represented by meaningful disrespect/coercion/manipulation/privacy severity.
- Regression coverage locks both aggression-only noise and severity-only real-harm counterexamples.
