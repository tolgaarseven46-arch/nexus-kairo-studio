# ADR-0043 — Direct Kaira self-fact query boundary

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

Kaira's canonical self-memory query is owned by the language-understanding / semantic canonicalization boundary. The deterministic fallback already recognized explicit self wording such as `senin`, `kendin`, `hayatında` and `geçmişinde`, while typed provider output could also supply `selfMemoryQuery`.

Natural direct preference questions such as `sen neyi seversin?`, `sen hangi müziği seversin?` and `sen neyi tercih edersin?` can express the same durable Kaira self-fact request without possessive/reflexive wording. Requiring the semantic provider to recognize every such surface form makes canonical self-memory routing unnecessarily provider-dependent.

Broadening bare `sen` itself would be unsafe. Ordinary social turns such as `iyi senin`, `sen nasılsın`, current-activity questions, reconciliation bids and relationship/boundary language must not become autobiographical or self-fact recall.

## Decision

The canonical semantic fallback may infer `self_fact` from bare `sen` **only when the same turn also contains an existing durable self-fact/preference cue**.

Examples accepted by the fallback include:
- `sen neyi seversin?`
- `sen hangi müziği seversin?`
- `sen neyi tercih edersin?`
- `senin favorin ne?`

Bare `sen` alone is not a self-memory signal. The following remain outside self-memory unless another canonical durable self-fact signal is present:
- `iyi senin`
- `sen nasılsın`
- `sen ne yapıyorsun`
- `gel senle barışalım`
- `sen benim kölemsin`

The fallback remains located only in `kairaSelfMemoryQuery.ts` at the canonical semantic boundary. Downstream dialogue, memory, response-plan, local-language or relationship consumers must not add independent parsing for these forms.

The deterministic fallback continues to avoid inventing a canonical `factKey`; exact fact keys belong to typed upstream semantic evidence.

## Consequences

- Direct natural Kaira preference questions are less dependent on provider wording coverage.
- Existing single semantic authority is preserved; no second self-memory parser is introduced.
- RelationshipReducer, ResponsePlan, social-move routing and ordinary `sen` conversation semantics are unchanged.
- Positive and negative matrices are permanently covered by `src/services/kairaSelfMemoryQueryContracts.test.ts`.

## Revisit condition

Do not widen this boundary from surface-form speculation. Revisit only if a measured conversation-quality regression shows a durable Kaira self-fact query that canonical semantic interpretation still fails to represent, or if the typed semantic provider gains a stronger structured self-query contract that can replace this fallback safely.
