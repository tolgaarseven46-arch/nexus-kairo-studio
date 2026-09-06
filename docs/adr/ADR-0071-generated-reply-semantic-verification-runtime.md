# ADR-0071 — Generated reply semantic verification runtime

Date: 2026-09-06
Status: Proposed

## Context

ADR-0070 / PR #123 added a final-delivery generated-claim provenance guard. The guard consumes canonical `SemanticInterpretation@2` objects for both the generated reply and admitted evidence, but the runtime still needs a safe way to obtain the generated reply interpretation.

## Decision

Reuse the existing server canonical language-understanding bridge for generated reply verification.

A dedicated coordinator calls `resolveServerLanguageUnderstanding(...)` only when the canonical ResponsePlan requires `engage_user_content` provenance verification.

This preserves:

- one semantic authority (`SemanticInterpretation@2`);
- no raw-text reply regex detector;
- no independent claim parser;
- no verification call for turns that do not require grounded content engagement.

## Boundary

The coordinator only produces canonical semantics. It does not decide acceptance and does not mutate the generated reply.

Final acceptance remains owned by `runKairaResponseConstraintPass(...)` through the ADR-0070 provenance guard.

## Remaining wiring

The chat runtime must pass the coordinator result as `replySemanticInterpretation` and the current canonical user interpretation as claim evidence into the final constraint pass. This wiring is intentionally a separate server seam from the coordinator itself so it can be reviewed without rewriting the large server pipeline.

## Regression invariant

A plan without `engage_user_content` must not invoke generated-reply LU verification.

A plan with `engage_user_content` must invoke the existing canonical server LU bridge and return its `SemanticInterpretation@2` result unchanged.
