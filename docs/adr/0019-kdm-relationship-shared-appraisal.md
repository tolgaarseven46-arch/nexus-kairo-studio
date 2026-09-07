# ADR-0019 — KDM relationship bridge consumes shared appraisal

Status: accepted

## Context

`kdmRelationshipReducerBridge` still owns a duplicate relationship-harm credibility calculation and negative-pattern categorization even after the shared SocialAppraisal seam was introduced. The formulas are canonical-field-only, but they remain a second appraisal authority.

## Decision

Keep the public compatibility export `semanticNegativePattern()` so existing tests and callers do not break, but make it delegate to `socialAppraisalEngine::socialNegativePattern()`. Remove the bridge-local harm-confidence and negative-pattern formulas.

RelationshipReducer transition, decay, recovery and affect-delta mathematics remain untouched in this migration slice.

## Consequences

- one canonical negative-pattern appraisal formula remains;
- KDM bridge becomes a wiring/projection layer rather than an appraisal owner;
- behavior parity is protected by regression tests;
- future harm-appraisal changes must occur in the shared SocialAppraisal seam.
