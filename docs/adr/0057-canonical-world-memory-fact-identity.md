# ADR-0057: Canonical world-memory fact identity

## Status
Accepted

## Context
The 2026-09-05 KNT acceptance trace exposed a retrieval failure on “benim manitin gözleri ne renkti”. Canonical language understanding knew the requested concept, but persisted world observations represented descriptive turns only as generic events plus raw text. Retrieval therefore allowed generic grounded/direct-interaction scoring to make unrelated rows eligible evidence.

## Decision
SemanticInterpretation@2 may carry optional typed `worldMemory` semantics: utterance claims and a single targeted query. A fact is identified by canonical `subjectId + attributeKey`, with a typed value and confidence. The compatibility SemanticEvent projection preserves this structure without raw-text reinterpretation; CanonicalWorldEvent persists claims as `memoryFacts`.

When a high-confidence world-memory query exists, retrieval uses exact typed fact identity as an eligibility gate. Generic grounded/direct/lexical scores cannot admit observations that do not carry the requested fact. The response guard receives the same query and deterministically preserves the matched fact value.

Legacy observations without typed facts remain available to legacy recall paths when no typed query exists; they are not promoted into answers for a typed fact query.

## Consequences
- Turn-13-style retrieval can no longer answer an eye-color query from a generic “partner exists” row.
- The language-understanding provider owns claim/query concept identity once; downstream layers consume it read-only.
- No new regex/raw-text semantic authority is introduced.
- New observations gain structured fact recall; legacy rows remain conservative rather than guessed.
- CI validates the final source head independently of the one-time patching mechanism used to assemble the multi-file change.
