# ADR 0020: Unknown commitment betrayal evidence stays downstream-neutral

## Status
Accepted

## Context
Commitment betrayal appraisal is allowed to become material only when the canonical cross-turn evidence resolves to `betrayal.status === "present"`. A prior commitment whose lifecycle is unresolved can produce `betrayal.status === "unknown"`; that uncertainty must remain visible for auditability without being converted into relational injury or affective pressure.

PR #248 already established the matcher-side fail-closed contract for ambiguous commitment lifecycle evidence. The missing proof was the application boundary: `applyCommitmentAppraisalEvidence` had no dedicated regression demonstrating that an `unknown` betrayal assessment cannot manufacture a negative downstream projection.

## Decision
Treat `betrayal.status === "unknown"` as evidence-bearing but materially neutral at the appraisal application boundary.

The application may expose the typed `betrayal` / `unfairness` assessments and append their reasons, but it must preserve the base appraisal's:

- relational projection,
- affective projection,
- confidence,
- material-effect decision.

In particular, unknown commitment evidence must not create harm evidence, negative relational valence, negative affective valence, or confidence escalation.

## Consequences
- No production behavior change is required; the current implementation already satisfies the invariant.
- A regression test now locks the application-level behavior.
- Future commitment appraisal work must resolve uncertainty upstream rather than interpreting `unknown` as adverse evidence downstream.
