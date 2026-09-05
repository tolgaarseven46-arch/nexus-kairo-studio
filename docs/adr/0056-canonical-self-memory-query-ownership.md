# ADR-0056: Canonical self-memory query ownership

## Status
Accepted

## Context
A 16-turn production KNT acceptance trace exposed a canonical contradiction. The message `peki ben onda en çok hangi özelliğini seviyordum` was interpreted with `target=third_party` while the same `SemanticInterpretation@2` also carried an autobiographical `selfMemoryQuery`. The projection preserved both fields, so Kaira's autobiographical runtime ran for a user/third-party memory question and its `missing` fallback could override grounded world-memory evidence.

The architectural rule remains: `SemanticInterpretation@2` is the single semantic authority. Downstream memory runtimes must not reparse raw text to decide ownership.

## Decision
The language-understanding gateway reconciles `selfMemoryQuery` ownership before projection:

- a `selfMemoryQuery` is valid only when the canonical target is `kaira`;
- when a provider emits `selfMemoryQuery` with any other canonical target, the gateway clears only that contradictory facet;
- the reconciliation is recorded as canonical evidence (`self_memory_query_requires_kaira_target`);
- no raw-text regex or downstream memory classifier is introduced;
- genuine Kaira autobiographical/self-fact queries with `target=kaira` remain unchanged.

## Consequences
The autobiographical runtime can continue to trust its typed query input. User/world/third-party memory questions can no longer fall into Kaira self-memory merely because the semantic provider emitted a contradictory facet.

This ADR does not solve world-memory evidence relevance or qualified-evidence realization. Those remain separate authority boundaries and must be evaluated after this ownership invariant is deployed.
