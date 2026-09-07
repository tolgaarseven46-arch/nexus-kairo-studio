# ADR-0015 — Appraisal authority map

Status: accepted

This ADR freezes the migration boundary for Kaira's social/relational appraisal refactor.

## Canonical authority

Raw user text may be semantically interpreted only inside the canonical language-understanding boundary. Downstream production consumers must consume structured canonical semantics and must not create new user intent, emotion, social-act, relationship meaning, or repair meaning from raw text.

## Allowed raw-text reads

1. Canonical semantic ingestion.
2. Output validation / Kaira self-observation of Kaira's own delivered text.
3. Storage/debug uses that do not derive new user semantics.

## Appraisal responsibilities

The following existing logic is appraisal-like and must converge on the planned SocialAppraisal seam:

- relationship harm/negative-pattern interpretation in `kdmRelationshipReducerBridge`;
- friendly/damaged relationship categorization in `relationshipBehaviorService`;
- raw-user-message distress/seriousness interpretation in `droitBehaviorEngine`;
- novelty/expectedness indices in `appraisalEngine` should be reused, not duplicated.

## Transition responsibilities

Relationship and affect reducers may project appraisal results into temporal state. They must not independently reinterpret raw user text.

## Behavior authority

`BehaviorContract` and `ResponsePlan` remain the WHAT/WHETHER behavior authority. `SpeechIdentity` and the local language realization path remain HOW-only.

## Dyadic style vs social norm

`kairoLanguageMemory` currently learns user/dyad writing style for HOW-only realization. This is not a social/pragmatic dyadic norm and must not be promoted into a hidden behavior authority.

## Migration order

E1 canonical-only discourse cleanup → appraisal contract → existing appraisal-logic migration → reducer input switch → appraisal-dependent shadow-authority cleanup → minimal dyadic norm → zero-effect → candidate readings → contextual adjudication → novel falsification.
