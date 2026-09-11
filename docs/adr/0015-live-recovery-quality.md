# ADR 0015 — Live Recovery Quality Boundary

## Status
Accepted for PR #229 validation.

## Context
A controlled 18-turn live provider session produced two final-delivery failures after the deterministic core had otherwise remained stable. One candidate failed the ResponsePlan content-engagement requirement; another candidate violated an already-resolved relationship-style boundary. In both cases the detector worked, but the user-facing recovery surface degraded to a generic failure response.

## Decision
Recovery remains a separate seam and does not become a new semantic or behavior authority.

The final constraint boundary may consume the already-detected violation list and ask `kairaRecoveryPolicy` for a bounded deterministic last-resort recovery candidate before legacy generic fallbacks are tried.

`kairaRecoveryPolicy`:
- never reparses the user message,
- never changes SemanticInterpretation, DialogueDecision, BehaviorContract, or ResponsePlan,
- only handles named, already-detected recovery classes,
- must submit its candidate through the same ordered final constraints as every other fallback.

Initial named classes:
- `content_engagement_missing`
- `intimacy_violation`

Unknown violations continue through the existing fallback chain unchanged.

## Consequences
- Gate/detector ownership remains unchanged.
- The two measured live failures have API-free regression coverage.
- Generic user-facing failure remains a final last resort rather than the preferred recovery surface.
- Live acceptance is not considered fully green until these regressions pass CI and a later short live verification confirms the recovery behavior.