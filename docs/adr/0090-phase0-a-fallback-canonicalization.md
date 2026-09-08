# ADR-0090 — Regex fallback must pass through canonical semantic completion

**Status:** Accepted  
**Date:** 2026-09-08

## Context

Phase-0 A-cluster characterization after PR #171 exposed a deterministic-ingress authority gap. `canonicalizeSemanticEvent(...)` correctly completes optional consumer-facing semantic facets such as `selfMemoryQuery`, while `interpretationFromRegexFloor(...)` previously lifted `interpretSemanticEvent(...)` directly into `SemanticInterpretation@2`.

That meant the same legacy/fallback event could carry canonical self-memory completion when exercised through `canonicalizeSemanticEvent(...)` contracts, yet lose that typed facet when the language-understanding gateway used its required regex-floor producer. Once the facet was preserved, a second contradiction became visible: the fallback event could carry a Kaira-owned `selfMemoryQuery` while its legacy target remained `unknown`, causing the canonical gateway ownership guard to discard the query again.

## Decision

`languageUnderstandingService` continues to consume exactly one deterministic fallback producer: `interpretationFromRegexFloor(message)`.

Inside that producer the fallback path is ordered as:

`interpretSemanticEvent(message) → canonicalizeSemanticEvent(message, event) → build canonical SemanticInterpretation@2`

`canonicalizeSemanticEvent(...)` remains the single completion owner for optional legacy/fallback semantic facets. When canonical completion yields a non-null `selfMemoryQuery` and the incoming legacy target is only `unknown`, that same completion seam sets the target to `kaira`, keeping the typed facet and its ownership internally consistent. Explicit non-Kaira targets are never overwritten.

The language gateway does not call the legacy canonicalizer directly, and no downstream consumer may compensate by reparsing raw user text. Semantic-provider and client-shared `SemanticInterpretation@2` paths are unchanged.

## Invariants

- `SemanticInterpretation@2` remains the sole current-turn semantic authority.
- This change does not introduce a new regex, classifier, self-memory authority, or downstream semantic parser.
- `interpretationFromRegexFloor(...)` remains the sole deterministic fallback producer consumed by the language-understanding gateway.
- A canonical fallback `selfMemoryQuery` may resolve an otherwise-unknown target to `kaira`; it may not override explicit `third_party` or `event` ownership.
- Self-memory ownership reconciliation still occurs at the canonical language gateway; a self-memory query that genuinely contradicts a non-Kaira target is removed before downstream use.
- Retrieval relevance and epistemic truth confidence remain distinct concepts.
- Live autonomous activity/state questions are not silently reclassified as durable autobiographical memory; those remain owned by their runtime-facts/world-state seams.

## Verification

A permanent language-gateway regression verifies that `senin en sevdiğin çiçek ne?` preserves the canonical `self_fact` query through fallback ingress with `target=kaira` and that the projected legacy/appraisal event receives the same typed query.

The bug-class neighbor proof covers a neighboring preference query, targeted autobiography, and a third-party recall counterexample that must produce neither Kaira self-memory nor Kaira ownership.

Architecture contracts additionally require the gateway to continue calling `interpretationFromRegexFloor(message)` and forbid direct `canonicalizeSemanticEvent(...)` use there.

This ADR closes the specific A-cluster ingress underreach identified by PR #171. It does **not** claim that all A scenarios are observable; current autonomous-state/self-world questions must still be evaluated against their proper runtime-facts authority before Phase-0 scaling can be opened.
