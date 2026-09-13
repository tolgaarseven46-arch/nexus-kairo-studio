# Long-history persistent-memory evidence preserves provenance

Date: 2026-09-13
Status: Characterization RED

## Context

ADR-0024 already owns the bounded persistent-memory retrieval policy: normal dialogue uses the small recent window and canonical `grounded_recall` may scan a deeper bounded window. Historical semantic replay separately establishes that a persisted `SemanticInterpretation@2` snapshot, when available, remains the semantic authority instead of reparsing historical raw text.

The current persistence boundary accepts `semanticInterpretation` in `saveKdmInteraction`, but the trace record does not persist it. `loadRecentKdmMemory` also drops the Firestore document id and exposes no semantic snapshot on `KdmMemoryItem`. By the time a validated long-history memory is rendered into `memoryContext`, the evidence has therefore been flattened to user/reply text plus scope/confidence without stable source identity or canonical semantic provenance.

## Characterization invariant

Persistent conversation-memory evidence that can influence a later response must retain:

- a stable persisted source identity from the stored trace record;
- the canonical semantic snapshot that was authoritative when the historical turn was accepted, when such a snapshot exists;
- both values across the load boundary so downstream consumers can treat retrieved material as provenance-carrying evidence rather than anonymous prose.

## Authority boundary

- This characterization does **not** change the existing 6/40 bounded retrieval policy, ranking, topical-anchor validation, storage selection, dialogue-move authority, or response-plan authority.
- Retrieved memory evidence does not become semantic authority merely because it was retrieved. Persisted canonical semantic snapshots remain authoritative for their historical turns; raw text remains compatibility evidence only where no snapshot exists.
- No raw-text classifier, regex recall patch, embedding system, vector store, or new retrieval algorithm is introduced by this characterization.
- Provenance is evidence metadata. It must survive persistence/loading before any later prompt rendering or response grounding can rely on it safely.

## RED requirement

The characterization remains RED until the persistence record stores the supplied canonical semantic interpretation and the retrieval contract returns both a stable persisted source id and the stored semantic snapshot.
