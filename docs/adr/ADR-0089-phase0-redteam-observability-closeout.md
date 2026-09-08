# ADR-0089 — Phase 0 red-team observability closeout

Status: Proposed
Date: 2026-09-08

## Context

The 21-scenario / 423-turn deterministic Phase 0 harness is intentionally AI-less and stops at `FINAL_PROVIDER_PROMPT_BUILT_NO_PROVIDER_CALL`. Claude red-team review identified that PASS did not establish behavioral cleanliness for clusters A/B/D/E because their typed detector snapshots were absent. It also requested detector self-validation, within-session common-ground isolation, prompt byte-parity evidence, and a 100+ turn stability falsification before scaling the corpus.

## Decision

1. Keep `SemanticInterpretation@2` as the sole current-turn semantic authority.
2. Phase-0 detector projections may consume only canonical interpretations, KDM/runtime state, response-plan output, and typed memory-runtime status. They must not parse raw user text or invent a parallel semantic reading.
3. Self-memory observability uses the real autobiographical recall runtime in an ephemeral (`welcome`) instance so no persistent store or model provider is touched.
4. B-family completeness observability is conservative: it activates only when canonical discourse facets already expose `signalsAlreadyAnswered`, `answerFriction`, or `correction`; lack of a richer canonical cause relation remains visible rather than being recreated in the detector.
5. D-family alignment and E-family repair/recovery detectors are observational projections of existing typed state and reasoning trace.
6. Every detector family used as a scale gate needs a known-bad self-test/counterexample, not merely a zero-violation run.
7. Production and Phase-0 share the exact `buildKairaFinalProviderSystemPrompt` serializer. Serializer byte-parity and production-context fidelity are reported as separate dimensions; the deterministic harness does not claim full persistent/provider context parity.
8. Within-session common ground remains discourse/session state, not autobiographical or dyadic long-term memory.
9. A deterministic 100+ turn falsification must keep mood/relationship state bounded and must not manufacture full repair semantics without repair evidence.

## Consequences

- Phase 0 can become more observable without adding a second semantic authority.
- A cluster may be partially observable rather than falsely reported as fully covered.
- The machine report must distinguish serializer parity from context fidelity.
- Corpus scaling remains blocked if detector coverage or long-horizon falsification fails.
