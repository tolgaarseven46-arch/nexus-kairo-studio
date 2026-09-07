# ADR-0019: DyadicSocialNorm v0 — learned familiarity is not permission

## Status

Accepted for v0 contract implementation.

## Context

Kaira must be able to appraise the same canonical social act differently for different people as relationship-specific experience accumulates. Existing `RelationshipState` stores warmth/trust/conflict/hurt/repair and coarse repetition traces, but it does not represent what kinds of social acts are historically familiar inside one specific Kaira↔person dyad.

Putting this information into global semantics would violate single semantic authority: `SemanticInterpretation@2` describes the current utterance, not a person's history with Kaira. Putting it directly into RelationshipReducer would also mix learned contextual appraisal with state-transition authority.

## Decision

Introduce a separate `DyadicSocialNormProfile` learned-context projection.

The v0 profile:

- is scoped to one `subjectId`;
- stores evidence by canonical social-act class;
- distinguishes observation frequency from historical impact;
- requires repeated evidence before a pattern is considered established;
- never treats frequency alone as permission or benignity;
- consumes canonical semantic categories only and never reparses raw user text.

`DyadicSocialNorm` is evidence/context, not a behavior decision. `SocialAppraisal` may consume a norm reading together with current semantic evidence and relationship state. RelationshipReducer remains the owner of relationship state transitions.

## Core invariant

**Expectedness is not permissibility.**

A frequently repeated harmful act may become highly expected while remaining explicitly non-permissive. Conversely, one apparently benign event can never establish a dyadic norm.

## Non-goals for v0

- No automatic persistence wiring yet.
- No automatic classification of historical impact from raw text.
- No direct tone/response selection.
- No global user-style profile shared across relationships.
- No reduction of current semantic severity merely because a pattern is familiar.

## Follow-up

The next appraisal slice will consume `DyadicNormReading` as one contextual input and add falsification tests for zero-effect, stranger-vs-familiar, frequent-harm, and counterfactual dyads.
