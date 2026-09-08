# ADR-0021 — SocialAppraisal candidate readings

## Status

Accepted for G2a foundation.

## Context

`SemanticInterpretation@2` is the immutable per-turn semantic authority. A social event can nevertheless admit more than one **contextual appraisal**: for example, canonical insult/mockery evidence may plausibly be literal harm or playful banter when joking/uncertainty evidence is material.

Collapsing that ambiguity directly into one relationship or affect result would make later dyadic context a post-hoc patch. Encoding the alternatives back into semantic interpretation would instead create a second semantic authority.

## Decision

Introduce a pure SocialAppraisal candidate-reading layer after canonical semantic interpretation and before final contextual appraisal.

A candidate reading contains:

- a typed contextual hypothesis (`literal_harm`, `playful_banter`, `affiliative`, `repair`, `rejection`, `neutral_social`),
- a direction (`harmful`, `benign`, `repairing`, `neutral`),
- local plausibility,
- typed canonical evidence provenance,
- auditable construct-level reasons.

Candidate plausibilities are independent support values, not normalized probabilities; they do not need to sum to one.

## Authority boundaries

The candidate layer MUST NOT:

- inspect or parse raw message text,
- rewrite `SemanticInterpretation@2`,
- declare a new semantic truth,
- choose relationship/affect deltas,
- mutate RelationshipState, mood, memory, or behavior,
- use dyadic norms to silently relabel canonical semantics.

The canonical interpretation remains authoritative for **what the utterance means at ingestion**. Candidate readings express only **how that canonical event might be contextually appraised**.

## G2a scope

G2a generates candidates from canonical semantic evidence only. Dyadic priors are intentionally deferred to G2, where they may reweight competing candidates without deleting canonical harm evidence or turning repeated harm into permission.

## Invariants

1. An ordinary neutral turn does not acquire invented social meaning.
2. Material ambiguity may preserve multiple competing readings.
3. A clear sincere harmful event does not receive a playful candidate without canonical ambiguity/banter evidence.
4. Candidate generation is pure and leaves canonical interpretation byte-for-byte structurally unchanged.
5. No candidate is itself a relationship or affect transition.

## Consequences

This creates an explicit seam for the target behavior: the same canonical event can later be appraised differently for different people because G2 can combine the same candidate set with different dyadic evidence, without moving person-specific history into semantic interpretation.
