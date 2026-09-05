# ADR-0020: Canonical semantic context grounding provenance

## Status
Accepted

## Context
Three production findings exposed the same missing dimension: a canonical semantic value could be correct or incorrect without recording whether it came from the current utterance or was introduced by conversational history. Short opaque `sg` gained invented thanks/affection under warm context, and `iyi maç izliyorum` was repeatedly relabeled as `greeting/how_are_you` solely because the previous assistant turn asked how the user was. The schema defines `socialRoutine` as a current-utterance facet, not the role of the previous adjacency pair.

## Decision
Keep `SemanticInterpretation@2` as the canonical authority and add an optional provider-computed `grounding` trace. The trace records that a context-free counterfactual adjudication occurred, which canonical fields changed under history, and which context-induced field changes were rejected. It is observational provenance, not a second semantic authority.

The existing short-token non-invention adjudication and the social-routine projection check now share this field-level grounding seam. Context-free adjudication stays bounded: it runs only on the existing short-token surface or when the contextual provider claims a social routine. A confident context-free current-turn social-routine reading wins over a conflicting history-induced routine; genuine routines such as `naber` remain unchanged when both readings agree.

## Consequences
- `socialRoutine` can no longer be copied from the previous adjacency pair when the current turn confidently says otherwise.
- The short-token `sg` guard is no longer an isolated mechanism; it is one consumer of the same provenance seam.
- KNT/debug and future policy work can inspect which semantic fields were history-influenced or rejected without reparsing raw text.
- No schema-version reset, second semantic classifier, or topic-specific lexical rule is introduced.
- If future findings require provenance for more fields, extend the grounding seam rather than adding independent context heuristics.
