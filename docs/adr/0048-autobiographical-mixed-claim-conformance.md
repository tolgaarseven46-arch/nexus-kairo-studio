# ADR-0048 — Resolved autobiographical replies require clause-level evidence conformance

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

ADR-0045 prevented a wholly unrelated invented autobiography from replacing a resolved canonical memory, but deliberately left one measured boundary open: a generated reply could include one true canonical anchor and then append an unsupported autobiographical person, place, time, cause or event detail. The existing guard treated the single anchor as sufficient for the whole reply.

A deterministic regression now reproduces that gap: a canonical storm/shelter memory accepts a first grounded rain clause while a second invented Ali/Paris/childhood clause rides through on the first clause's evidence.

## Decision

For resolved `autobiographical_memory` replies:

- The strongest canonical memory remains the only autobiographical evidence source.
- Zero canonical anchors still use the ADR-0045 `self_memory_resolved_memory_anchor_missing` fallback.
- Generated autobiographical text is split only at explicit surface clause boundaries (sentence punctuation and a narrow conjunction set). Every non-framing clause must carry at least one lexical/morphological canonical evidence anchor.
- Named/numeric structured details in the generated reply must themselves be grounded in canonical evidence; an invented proper name/place or number cannot hide inside an otherwise anchored clause.
- On violation, the reply is replaced with the existing deterministic canonical-memory summary and reason `self_memory_resolved_memory_clause_unsupported`.
- The guard does not re-parse the user turn, infer new facts, mutate memory, or create a second semantic authority.

## Consequences

- A correct first sentence can no longer launder an unrelated invented second autobiographical event.
- Unsupported named details such as a fabricated person/place cannot survive merely because the same sentence also contains a true memory anchor.
- Natural grounded paraphrases remain available when each clause is anchored.
- This remains a conservative lexical/evidence guard rather than general semantic entailment. If future regressions show unsupported lowercase detail inside a single otherwise-grounded clause, address that with a typed generated-claim/evidence design rather than an expanding semantic regex catalog.

## Regression coverage

`src/services/kairaAutobiographicalEvidenceAnchorRegression.test.ts` covers:

- wholly unrelated memory substitution,
- canonical first clause + invented second clause,
- invented named detail inside an anchored clause,
- preservation of natural multi-clause grounded realization.
