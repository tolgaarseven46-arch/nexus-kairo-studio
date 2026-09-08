# ADR-0025 — SocialAppraisal G3 contextual resolution

## Status

Accepted for G3 foundation.

## Context

G1 establishes exact zero when there is no material canonical evidence. G2a preserves competing contextual readings. G2 reweights those readings using established same-subject dyadic norm evidence.

A downstream reducer must not independently reinterpret candidate lists, otherwise relationship, affect, and behavior layers would each invent their own social meaning.

## Decision

Introduce one pure G3 resolution pipeline:

1. exact-zero gate,
2. canonical candidate generation,
3. bounded dyadic reweighting,
4. independent relational and affective projections.

The result is the existing typed `SocialAppraisalResult` plus audit metadata (candidate list, dominant reading, ambiguity, whether dyadic evidence was applied).

## Projection separation

Relationship and affect are deliberately independent.

- Only canonical `target === "kaira"` may create Kaira↔user relationship harm/repair/affiliative significance.
- A third-party event may still create affective pressure without altering the user relationship.
- An emotional share may create affective significance without inventing relationship injury.
- A neutral no-evidence turn remains exact zero in both projections.

## Harm guard

G3 consumes the G2 harm floor. An established benign banter norm can lower literal-harm pressure but cannot erase it.

## Scope limits

G3 does not yet:

- mutate RelationshipState,
- transition persistent/current mood,
- modulate appraisal from personality or current state,
- choose behavior or response,
- learn/persist new dyadic norm evidence.

Those remain explicit later seams. In particular, RelationshipReducer must eventually consume the resolved appraisal rather than re-deriving contextual social meaning from raw/canonical fields independently.

## Required invariants

1. No material evidence → literal exact zero.
2. Same canonical event + different established dyadic evidence → different relational/affective pressure.
3. Non-Kaira target → zero user-relationship significance.
4. Emotional load can affect affective projection without relationship injury.
5. Benign dyadic history cannot erase canonical harm.
