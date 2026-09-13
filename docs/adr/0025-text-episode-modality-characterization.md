# ADR-0025 — Text episode and utterance-modality characterization

Status: Characterization checkpoint; no production change.

## Context

Kaira's pre-API architecture must preserve persistent-state integrity when users communicate in fragmented Discord-style bursts or in a single compound message containing several distinct propositions.

`SemanticInterpretation@2` is the canonical current-turn semantic authority. This checkpoint tests whether that existing authority can represent:

1. a bounded list of propositions rather than flattening a compound/fragmented episode into one semantic event;
2. utterance modality that distinguishes assertion, question, hypothetical, wish, and prediction so non-facts cannot become persistent facts;
3. proposition-level identity/time/confidence/provenance required by downstream integrity gates.

This is intentionally distinct from existing `worldEventModality`, which classifies execution strength such as possibility/intention/plan/desire/commitment/refusal after a world-event proposition exists.

## Decision

Add characterization-only RED tests first. Do not patch runtime or add a new authority until the RED identifies the owning seam.

If the RED is confirmed at the canonical semantic contract, prefer extending `SemanticInterpretation@2` with bounded typed propositions and utterance modality rather than introducing a parallel parser/authority.

Fragmented-message episode assembly is treated as batching/input-boundary logic around the same canonical semantic authority, not a second semantic authority.

## Safety invariant

Perfect understanding is not required before API use. Persistent-state integrity is required: unresolved, interrogative, hypothetical, wished, predicted, or otherwise non-asserted content must not silently become canonical fact merely because it appeared in user text.

## Scope

This ADR deliberately excludes image/GIF/audio/video interpretation. Multimodal design is deferred.
