# ADR-0020 — Canonical discourse shape authority

Status: accepted

## Context

`discourseStateReducer` still derived two user-turn discourse cues directly from raw text after canonical language understanding: short-utterance shape and activity-answer shape for pending `what_doing` questions. These are not relationship or affect semantics, but they still influence discourse dependency and topic-transition behavior.

## Decision

Move both shape readings to canonical ingestion-time discourse facets:

- `shortUtteranceShape`
- `activityAnswerShape`

`semanticDiscourseFacetRecognizer` is the only raw-user-text reader for these cues. The compatibility projection carries them into `SemanticEvent`. `discourseStateReducer` consumes only the structured fields and no longer recreates the shapes from raw user text.

## Consequences

- downstream discourse state becomes canonical-only for these cues;
- persisted older SemanticInterpretation@2 snapshots remain compatible because the new fields are optional;
- raw message text may still be stored as a thread anchor, but it may not be interpreted into new discourse meaning downstream.
