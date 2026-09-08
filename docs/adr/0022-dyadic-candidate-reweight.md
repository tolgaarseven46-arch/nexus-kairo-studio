# ADR-0022 — Dyadic reweighting of SocialAppraisal candidates

## Status

Accepted for G2.

## Context

ADR-0021 preserves multiple contextual readings of one immutable canonical social event. ADR-0019 provides learned social-norm evidence scoped to one Kaira↔person dyad.

The target architecture requires the same event to produce different appraisal pressure for different people without making person history part of semantic interpretation and without normalizing repeated harm into permission.

## Decision

G2 applies an established `DyadicSocialNormProfile` only as a bounded reweighting layer over SocialAppraisal candidate readings.

Inputs are:

- immutable `SemanticInterpretation@2`,
- candidate readings produced by G2a,
- active `subjectId`,
- the active dyad's `DyadicSocialNormProfile`.

Outputs retain each candidate's base plausibility and expose contextual plausibility plus the signed dyadic adjustment.

## Subject isolation

A norm profile whose `subjectId` differs from the active subject is never applied. The result is explicitly marked `subjectMatched=false`, all candidate weights remain unchanged, and the reason is auditable.

## Evidence threshold

A dyadic norm does not affect appraisal until `readDyadicNorm(...).established` is true. One benign observation therefore cannot create a special social rule.

## Harm normalization guard

Frequency is not permission.

- Repeated harmful behavior may increase expectedness but cannot increase playful plausibility.
- Only an established `permissiveCandidate` backed by benign evidence may lift a playful reading or dampen literal-harm pressure.
- Literal canonical harm is never erased. Benign dyadic evidence is bounded by a harm floor.
- Canonical semantics and severity remain unchanged.

## Scope

G2 reweights candidate hypotheses only. It does not yet:

- commit a final winning appraisal,
- update RelationshipState,
- transition affect/mood,
- select behavior or response,
- persist new norm observations.

Those remain downstream responsibilities.

## Required counterexamples

1. Same canonical ambiguous insult + established benign Alice dyad versus established harmful Bob dyad must yield different candidate weights.
2. Benign history cannot erase the literal-harm candidate.
3. Repeated harmful familiarity cannot become playful permission.
4. Alice's profile cannot affect Bob.
5. One benign observation cannot reweight appraisal.

## Consequence

Person-specific relationship history now has an explicit, typed route into contextual appraisal while semantic interpretation remains globally canonical and RelationshipReducer remains downstream of appraisal rather than becoming an interpretation authority.
