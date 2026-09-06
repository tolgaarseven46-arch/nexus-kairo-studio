# Canonical discourse dependency facets

Status: Accepted
Date: 2026-09-06

## Context

The targeted architecture audit confirmed that `discourseSocialAct.ts` / `discourseStateReducer.ts` recreated three user discourse signals directly from raw text after canonical language understanding: already-answered cues, answer-friction cues, and state-answer shape. This contradicted the existing `SemanticInterpretation@2` invariant that discourse-facing utterance semantics are produced once at ingestion and never recreated downstream.

## Decision

These three cues are canonical `SemanticInterpretation.discourseFacets` fields:

- `signalsAlreadyAnswered`
- `answerFriction`
- `stateAnswerShape`

A deterministic recognizer may inspect raw user text only inside the language-understanding ingestion boundary. The resulting typed fields are normalized, persisted with the canonical interpretation, deterministically projected to compatibility events, and consumed by `DiscourseState` without a fresh parse.

## Invariants

- `SemanticInterpretation@2` remains the single semantic authority for user-turn discourse facets.
- `DiscourseState` must not run raw-text recognizers for these signals.
- Historical turns without the new persisted facets fail closed; raw historical text is not reparsed to reconstruct them.
- Kaira reply classification remains output-side self-observation and is not affected by this decision.
- The migration does not change relationship, emotional, or response-plan authority.

## Migration seam

The former downstream regex recognizers are moved to `semanticDiscourseFacetRecognizer.ts`, which is invoked only by `languageUnderstandingService` during canonical ingestion. `semanticInterpretationProjection.ts` carries the typed values forward as a deterministic compatibility projection. `discourseStateReducer.ts` consumes those values directly.

## Regression requirement

A user turn such as `dedim ya` must carry canonical already-answered/friction evidence and become `answer_with_friction` only through that evidence. A state-shaped answer such as `iyi ya` must close a pending how-are-you question through the canonical `stateAnswerShape` facet. A turn without those canonical signals must not have friction synthesized downstream.
