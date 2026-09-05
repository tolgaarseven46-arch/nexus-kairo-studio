# ADR-0049 — Kaira structured-memory ontology is a registry of existing authorities

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

Kaira already has multiple intentionally distinct memory/state mechanisms: canonical self identity, autobiographical memory, world events, Claim provenance, learned language style, relationship state and ephemeral discourse state. The stores have been hardened independently, but the architecture did not have one lightweight typed document declaring which domain owns which semantics. That omission makes future features vulnerable to cross-store promotion or a second authority even when today's runtime behavior is correct.

The audit found no evidence that these domains should be collapsed into one runtime store or one retrieval engine. In particular, Claim provenance is evidence rather than world truth, language memory is HOW-only, relationship state is reducer-owned state rather than factual memory, and discourse state is recomputed rather than persisted truth.

## Decision

Add `kairaMemoryOntology.ts` as a declarative architecture registry. It performs no runtime retrieval, persistence, semantic classification or response decision.

The canonical domains are:

1. `self_fact` — instance-owned canonical identity truth; evidence-revised.
2. `autobiographical_memory` — instance-owned canonical lived/inherited self memory; append/retention semantics.
3. `world_event` — grounded world truth.
4. `claim` — provenance-preserving evidence whose effective support is derived; promotion to world truth requires the existing explicit grounded seam.
5. `language_style` — bounded, policy-gated HOW learning; never truth memory.
6. `relationship_state` — reducer-owned relational state; never content truth.
7. `discourse_state` — ephemeral/recomputed conversation state; never durable truth.

The registry records authority, semantic kind, persistence class, mutability, recall authority and allowed promotion. It is an architecture contract, not a new memory brain.

## Consequences

- Future memory features must choose an existing domain or explicitly extend the ontology rather than silently writing across stores.
- Claim → WorldEvent remains the only declared cross-domain truth promotion and remains explicitly grounded.
- Lived autobiographical append is declared as the controlled path into canonical self autobiography; it is not a generic claim/world promotion.
- Learned wording, relationship scores and discourse history cannot become factual truth merely because they persist or are available at response time.
- Existing runtime behavior and persistence formats are unchanged by this ADR.

## Verification

`kairaStructuredMemoryOntologyContracts.test.ts` locks domain completeness, authority ownership, promotion boundaries and the truth/evidence/style/state separation.
