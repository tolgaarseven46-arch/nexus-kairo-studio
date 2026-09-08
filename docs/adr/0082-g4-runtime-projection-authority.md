# ADR-0082 — G4 runtime projection authority

- **Status:** Accepted
- **Date:** 2026-09-08

## Context

`SemanticInterpretation@2` is the canonical semantic truth for a turn, while G3/G4 contextual appraisal determines how that event matters to Kaira in the current dyad and state. The runtime bridge previously rebuilt `RelationshipTurnSignal` directly from semantic fields such as valence, severity, apology/repair, support, compliment, and affection. That bypassed G4 and created a second interpretation authority at the relationship reducer seam.

This also coupled transient affect to the relationship reducer path even though G4 already exposes independent relational and affective projections.

## Decision

1. **Resolve G4 once per canonical turn.** Runtime consumes one contextual appraisal result for the turn instead of independently reconstructing social meaning downstream.
2. **Relationship mutation consumes the G4 relational projection.** `RelationshipReducer` remains the canonical relationship state-transition authority, but it is not a semantic/appraisal authority. Canonical semantic severity supplies the harm-vector category/shape required by the reducer contract; G4 `relational.harmEvidence` supplies ordinary projected harm magnitude.
3. **Transient affect consumes the G4 affective projection independently.** Affective impact is not inferred from relationship injury or the reducer result. Legacy reducer `affectDelta` is not a fallback authority when G4 projects no affect.
4. **Grounding scope is a hard relational gate.** A `third_party`, `event`, or otherwise non-dyadic turn cannot mutate the Kaira-user relationship. It may still have non-zero affective significance.
5. **Context modulates ordinary magnitude, not hard-boundary existence.** If a canonical present-turn harm dimension reaches the configured redline present-severity floor, relationship familiarity/tolerance buffering cannot push that dimension below the floor before `RelationshipReducer` evaluates redline policy.
6. **Repair and affiliation cannot be manufactured downstream.** Canonical apology/repair/support/compliment/affection fields provide source evidence, but the runtime relationship signal is enabled only when the G4 relational projection permits that direction. An out-of-dyad or grounded-veto event cannot become relationship repair merely because canonical flags are present.
7. **Exact-zero remains exact-zero.** A no-material-effect G4 result projects zero relationship mutation signals and zero affective pressure, even if the legacy reducer independently produced a non-zero affect delta.
8. **Projection provenance is observable.** Runtime trace data records the G4 relational/affective result and context factors so later reducers, behavior policy, and debugging can be audited against the same authority.

## Current seam boundary

This decision makes G4 authoritative for **harm magnitude**, **affective magnitude**, relational direction/materiality, and scope gating at the runtime seam. The existing `RelationshipTurnSignal` contract does not yet carry a scalar repair-strength field. Therefore repair currently consumes G4 **repair materiality/direction** while `RelationshipReducer` retains its existing configured recovery magnitude rules. This is an explicit remaining seam, not an implied completed migration; any future repair-magnitude migration must change the typed reducer contract rather than reintroduce downstream interpretation.

## Consequences

- `src/services/socialAppraisalRuntimeProjection.ts` is the explicit runtime seam between contextual appraisal and downstream state transitions.
- `src/services/kdmRelationshipReducerBridge.ts` resolves G4 once and projects independent relationship and affect channels from that result.
- `RelationshipReducer` still owns deterministic relationship state transitions, familiarity, recovery, redline evaluation, axes, and persistence-facing output; it no longer decides what the current event socially means.
- Third-party harm can upset Kaira without falsely damaging the user relationship.
- Strong/familiar relationships can soften ordinary relational impact while hard boundaries remain enforceable.
- Neutral/no-material-effect appraisal cannot leak legacy reducer affect into dynamic state.
- Legacy or parallel appraisal helpers must not become production authorities unless routed through this seam.

## Regression guards

`src/services/socialAppraisalRuntimeProjection.test.ts` locks the runtime seam against:

- third-party relational veto with independent affect,
- exact-zero relationship and affect leakage,
- semantic severity retaking ordinary magnitude authority,
- grounded fake-repair manufacture,
- hard-boundary severity-floor erosion,
- affiliation/affection direction reclassification.

This ADR extends `0026-social-appraisal-context-modulation-g4.md` and is consistent with `ADR-0047-canonical-affect-runtime-authority.md`.