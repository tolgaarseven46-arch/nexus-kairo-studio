# ADR-0018 — Relationship behavior consumes shared appraisal

Status: accepted

## Context

`relationshipBehaviorService` previously recomputed closeness and friendly/damaged/severely-damaged/healing relationship categories with its own thresholds. This duplicated appraisal-like reasoning already being centralized in the SocialAppraisal migration.

## Decision

`applyRelationshipContext()` now consumes `appraiseRelationshipContext()` from `socialAppraisalEngine` for all relationship-context categorical appraisal. The service remains a behavior projection layer: it may turn the shared appraisal into tone/humor/patience/empathy directives, but it no longer owns the underlying relationship-state categorization formula.

## Consequences

- one appraisal question has one formula;
- relationship behavior remains HOW/projection-oriented;
- existing behavioral thresholds and output are preserved by parity tests;
- future changes to relationship-context appraisal must occur at the shared appraisal seam rather than in this consumer.
