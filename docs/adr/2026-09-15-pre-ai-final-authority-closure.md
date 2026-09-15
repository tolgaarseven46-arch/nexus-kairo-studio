# ADR: Pre-AI final authority closure for historical grounding and speech HOW-only boundary

Date: 2026-09-15
Status: Accepted for characterization/fix branch

## Context

The final pre-AI closure review identified two narrow authority leaks on current main:

1. Historical grounding can infer uncertainty from raw historical text even when a persisted `SemanticInterpretation@2` snapshot exists.
2. `KairoSpeechIdentity` is declared HOW-only but two reaction-mode instructions independently forbid reopening closeness / declaring repair complete, decisions already owned by `KairaResponsePlan`.

The Dialogue Board concern was rechecked against current main and is not a live gap: its emitted block is explicitly observational and states that question/advice/humor/speculation/social-move permissions belong to DialogueDecision and KairaResponsePlan.

## Decision

- Persisted semantic snapshots are authoritative for historical uncertainty evidence. Historical raw text may remain the quoted surface text, but must not independently decide whether uncertainty exists when a canonical snapshot is present.
- Historical turns without a canonical semantic snapshot are not promoted into uncertainty evidence by the final authority path.
- Current-turn grounding remains outside this historical-authority change.
- SpeechIdentity remains HOW-only. Relationship reopening, forgiveness, repair completion, and other WHAT/WHETHER permissions remain owned by BehaviorContract/KairaResponsePlan.
- Provider-output repair remains a realization-stage retry. Repaired output must pass the same grounding/attribution/dialogue/response-plan/affect/world-model validators as the original draft before delivery.

## Invariants

1. Persisted historical semantics win over raw historical wording for uncertainty classification.
2. Missing historical semantic authority fails closed rather than creating a second parser authority.
3. SpeechIdentity may shape distance, rhythm, warmth, register, and display intensity, but may not independently grant or deny relationship actions.
4. Dialogue Board remains observational only.
5. Repair generation cannot bypass the original validator chain.

## Proof strategy

- Characterization tests first demonstrate the historical-grounding and SpeechIdentity leaks.
- Minimal production changes remove only those authority leaks.
- Neighbor regression covers: persisted uncertainty preserved, persisted certainty not reinterpreted, HOW-only speech boundary, and existing ResponsePlan reopening/forgiveness enforcement.
- Full CI and production build are required before merge.
