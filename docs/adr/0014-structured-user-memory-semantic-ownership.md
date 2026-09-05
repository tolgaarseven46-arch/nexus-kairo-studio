# ADR-0014: Structured user-memory extraction consumes canonical semantic target

## Status
Accepted

## Context
The first real chat baseline exposed `seni seviyorum` being persisted as a generic user preference. The structured-memory extractor was independently reparsing raw text even though ingestion had already produced `SemanticInterpretation@2` with a Kaira-directed affection target.

## Decision
Structured user-memory extraction consumes the ingestion-time canonical semantic interpretation when deciding whether a lexical candidate belongs to preference memory. Kaira-directed affection/closeness is relational evidence, not a generic user preference. No second classifier is introduced.

## Consequences
- Kaira-directed affection is not stored under `preferences`.
- Non-dyadic statements such as `kahveyi seviyorum` remain eligible.
- Self/autobiographical Kaira memory remains outside this change.
