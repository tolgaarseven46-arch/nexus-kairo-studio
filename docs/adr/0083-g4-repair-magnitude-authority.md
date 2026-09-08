# ADR-0083 — G4 repair magnitude authority

- **Status:** Accepted
- **Date:** 2026-09-08

## Context

ADR-0082 made the runtime G4 appraisal authoritative for relational direction/materiality and bounded context modulation, but left one explicit compatibility seam open: `RelationshipTurnSignal` carried only boolean `apology` / `repairAttempt`, while `RelationshipReducer` independently derived repair magnitude from configured apology strength and a separate sincerity formula.

That split meant downstream state transition could still invent a different repair magnitude from the canonical appraisal path. It also made hostile continuation dangerous: apology flags could be present in the same turn as harmful social meaning and accidentally activate relationship repair.

Candidate-reading plausibility is not a repair magnitude. It remains contextual evidence used to resolve social meaning, just as ADR-0082 established that candidate plausibility is not harm severity.

## Decision

1. `RelationshipTurnSignal` carries a required typed `repairStrength: number` in the 0..1 range.
2. Canonical semantic repair evidence owns the base magnitude. For an actual canonical apology/repair act, the existing sincerity relationship is projected once at the runtime appraisal seam: `0.6 + sincerityConfidence * 0.4`, clamped to 0..1.
3. G4 owns bounded contextual modulation of that base through `contextFactors.relationalRepair`.
4. G4 resolved relational direction/materiality gates the scalar. If repair is not materially allowed, or the resolved relational direction is hostile/non-positive, `repairStrength` is exactly zero.
5. Explicit third-party/event scope therefore projects zero repair magnitude even when canonical apology flags are present.
6. `RelationshipReducer` consumes `repairStrength` directly for apology-driven interaction recovery, repair-progress gain, and repair-driven trust gain. It must not derive repair magnitude again from sincerity, candidate plausibility, raw text, or relationship history.
7. Boolean `apology` / `repairAttempt` remain typed event/FSM signals; they cannot create repair state when `repairStrength` is zero.
8. Repair magnitude does not bypass hard-boundary lifecycle rules. Existing recovery caps, injury floors, state-machine thresholds, and red-line authority remain owned by `RelationshipReducer` configuration.

## Authority boundary

- `SemanticInterpretation@2`: canonical per-turn semantic evidence, including sincerity and apology/repair flags.
- G3/G4 SocialAppraisal: relational direction/materiality and bounded context modulation.
- Runtime projection: creates the single typed `repairStrength` scalar from canonical base evidence plus G4 modulation.
- `RelationshipReducer`: deterministic state transition consuming that scalar; no secondary repair-magnitude interpretation.

## Consequences

- Two otherwise identical apologies can have different repair impact because relationship/personality/current-state context modulates the typed scalar, without changing whether the utterance is semantically an apology.
- A hostile continuation cannot repair the relationship merely by carrying apology flags if resolved relational meaning remains negative.
- Third-party apologies can affect Kaira transiently but cannot repair the Kaira-user dyad.
- Tests can now distinguish repair materiality from repair magnitude explicitly.

## Regression guards

- `relationshipReducer.test.ts` locks monotonic repair/recovery scaling and zero-strength non-repair behavior.
- `socialAppraisalRepairMagnitudeAuthority.test.ts` locks canonical-sincerity base magnitude, bounded relationship-context modulation, third-party veto, and hostile-continuation false-repair prevention.

This ADR closes the explicit repair-magnitude seam recorded in ADR-0082.
