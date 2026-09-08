# ADR-0026 — SocialAppraisal G4 bounded context modulation

## Status

Accepted for G4 foundation.

## Context

G3 resolves canonical social meaning into independent relational and affective projections. The product goal, however, requires the same resolved event to feel different depending on Kaira's stable personality, current dynamic state, and the quality/history of the active relationship.

That variation must not create a second semantic authority. Personality, mood, and relationship context may change sensitivity, but they must not reinterpret target, intent, social act, valence, or invent effect where G3 resolved exact zero.

## Decision

Introduce a pure G4 modulation layer above G3.

G4 consumes the typed `SocialAppraisalInput` and may only scale already-existing G3 projection magnitudes using bounded factors derived from:

- stable normalized personality,
- current canonical dynamic affect state,
- current canonical relationship projection.

The factors are auditable and bounded to a narrow range. G4 does not inspect raw user text and does not regenerate candidate readings.

## Required invariants

1. G3 exact zero remains exact zero under every personality/state/relationship context.
2. G4 cannot change semantic target, intent, or candidate reading set.
3. G4 cannot flip resolved relational or affective valence.
4. Third-party harm remains zero in the Kaira↔user relationship projection.
5. Current dynamic affect may modulate affective significance/activation without manufacturing relationship harm.
6. Stable warm/trusting relationship context may buffer ambiguous/minor injury, but never erase canonical harm.
7. Personality changes response sensitivity only through bounded magnitude modulation.

## Authority separation

- SemanticInterpretation owns canonical event meaning.
- G2/G3 own contextual social reading and relational/affective projection direction.
- G4 owns bounded sensitivity modulation only.
- RelationshipReducer remains the future owner of durable RelationshipState mutation.
- Dynamic affect reducer remains the future owner of state transition/recovery.
- Behavior/ResponsePlan remain downstream behavior authorities.

## Scope limits

G4 still does not:

- mutate RelationshipState,
- mutate DroitDynamicState,
- persist or learn dyadic norms,
- choose behavior or response,
- reparse raw text,
- add a classifier or phrase rule.

The next integration step is to make downstream relationship and affect transition code consume the resolved G4 appraisal rather than independently re-derive the same contextual social meaning.
