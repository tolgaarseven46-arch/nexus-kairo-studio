# ADR-0013 — Runtime Response-Plan Seam Hardening

- Status: Accepted
- Date: 2026-09-04

## Context

Production-style chat testing exposed three narrow runtime seam defects without invalidating the canonical behavior architecture:

1. A punctuationless embedded direct question such as `güzel, hangi maç ya` could escape the existing `allowQuestion=false` response-plan validator because direct interrogative detection was biased toward sentence-initial forms.
2. `PlanResolver` already supports uncertainty damping, but the canonical `SemanticInterpretation.uncertainty.overall` value was not transported into the resolved response plan, so the resolver used its default semantic uncertainty.
3. Activity permission presentation could prettify process-owned `activityType` / `activityId` keys and expose internal identifiers as user-facing text.

## Decision

No new behavior authority or parallel response guard is introduced.

- `KairaResponsePlan` remains the single WHAT/WHETHER behavior-plan projection.
- Existing question-act validation is extended only to recognize conversationally prefixed / punctuation-separated direct interrogatives without requiring `?`.
- Canonical semantic uncertainty is projected read-only onto the appraisal event, transported through the behavior-contract seam as observational metadata, and consumed by the existing `PlanResolver`. It cannot grant or revoke a hard permission by itself.
- Activity permission remains structured UI data outside the planner-owned assistant reply. Process identifiers are never used as presentation fallbacks; unsafe structured keys degrade to generic copy.

## Consequences

- `allowQuestion=false` can no longer be bypassed by the observed punctuationless embedded-question form.
- Runtime response plans expose the real canonical semantic uncertainty instead of silently substituting the resolver default when the value exists.
- Internal activity correlation identifiers cannot be converted into human-looking permission labels.
- The architecture keeps one semantic authority and one behavior-plan authority; this change hardens existing seams rather than adding another decision layer.

## Verification

Regression coverage must include:

- a punctuationless embedded direct-question rejection under `allowQuestion=false`,
- canonical uncertainty propagation from language understanding to the resolved response plan,
- activity permission presentation that rejects structured internal keys and never falls back to `activityId`.
