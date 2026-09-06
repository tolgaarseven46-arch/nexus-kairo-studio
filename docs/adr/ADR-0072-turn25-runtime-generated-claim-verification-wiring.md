# ADR-0072 — Turn 25 runtime generated-claim verification wiring

Date: 2026-09-06
Status: Proposed

## Context

PR #123 added a typed generated-claim provenance guard to the canonical final constraint pass. PR #124 added a coordinator that reuses the existing canonical `SemanticInterpretation@2` language-understanding authority to interpret a generated reply only when `engage_user_content` requires provenance verification.

The remaining gap is runtime wiring. Without it, the final constraint pass receives no generated-reply semantics and therefore cannot evaluate whether a generated factual/conversational claim is supported by canonical conversation evidence.

This is the Turn 25 failure mode from the 27-turn real-user test: an invented claim such as `sen bi şeyler çevirdin ama itiraf etmiyorsun` could otherwise pass final delivery even though the user supplied no supporting claim.

## Decision

In the AI chat runtime, after generation/repair/fallback selection and before `runKairaResponseConstraintPass(...)`:

1. Call `resolveGeneratedReplySemanticVerification(...)` with the final generated candidate, the canonical response plan, the selected provider, and the existing semantic-generation bridge.
2. Pass the returned `SemanticInterpretation@2` as `replySemanticInterpretation` to the final constraint pass.
3. Pass canonical claim evidence from:
   - current turn: `canonicalSemantic.interpretation`;
   - historical user turns that already carry persisted `semanticInterpretation` snapshots.
4. Do not reparse historical raw text.
5. Do not add reply regexes, keyword matchers, attribute-prefix heuristics, or a second semantic authority.
6. Deterministic dialogue-owned fallback text remains outside generated-claim verification; the existing final-pass original-candidate boundary already enforces this.

## Scope and cost boundary

Generated-reply semantic verification runs only when the response plan contains `engage_user_content`. Other turns incur no additional semantic provider call.

## Regression invariant

`server.ts` must route AI-generated candidates through `resolveGeneratedReplySemanticVerification(...)` before canonical final delivery and must supply both generated reply semantics and canonical current/history evidence to `runKairaResponseConstraintPass(...)`.
