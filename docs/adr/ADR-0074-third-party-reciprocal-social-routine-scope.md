# ADR-0074: Reciprocal social routines require Kaira target

- Status: Accepted
- Date: 2026-09-07

## Context

A fresh 13-turn live KNT conversation exposed a canonical field-coherence failure on Turn 10. The user asked about a third party's current activity (`ee selami napıyor`). The canonical interpretation resolved `target=third_party` but simultaneously carried `socialRoutine=what_doing`.

`how_are_you` and `what_doing` are reciprocal Kaira-facing social routines in DialogueDecision. Because the routine facet was accepted independently of target scope, DialogueDecision treated the turn as if the user were asking what Kaira was doing. With no grounded evidence about the third party, generation produced an unsupported status claim and the final consistency path accepted it.

The first broken boundary is therefore canonical semantic field coherence, before DialogueDecision or response realization.

## Decision

The canonical language-understanding gateway owns this reconciliation.

After target/entity reconciliation, if:

- `target === third_party`, and
- `socialRoutine` is `how_are_you` or `what_doing`,

then the reciprocal routine facet is cleared to `none` while the canonical target and primary intent remain unchanged.

The reconciliation adds typed evidence cue `reciprocal_social_routine_requires_kaira_target` with provider `canonical_language_gateway`.

Genuine Kaira-directed reciprocal routines remain unchanged.

## Why this boundary

This is a contradiction between fields of the same canonical `SemanticInterpretation@2`, not a downstream dialogue-policy exception. Repairing it in DialogueDecision would teach a lower layer to reinterpret canonical semantics and would duplicate semantic authority.

The gateway already owns typed provider-drift reconciliations and can resolve this contradiction without reparsing raw text.

## Invariant

`how_are_you` / `what_doing` may be reciprocal social routines only when their semantic target is Kaira. A third-party question may still be a question or information request, but it must not inherit Kaira-directed reciprocal routine behavior.

## Non-goals

This change does not:

- add a Selami/Ece/name-specific rule;
- add a raw-text regex or classifier;
- change entity resolution;
- change world-memory retrieval/ranking;
- change generated-claim provenance;
- fix the separate Turn 11 or Turn 12 delivery failures from the same live session.

## Verification

`kairaThirdPartySocialRoutineScopeRegression.test.ts` locks:

1. third-party `what_doing` is reconciled to `none`;
2. genuine Kaira-directed `what_doing` is preserved;
3. third-party `how_are_you` is reconciled to `none`.

The PR must also pass architecture contracts, beta acceptance, full Vitest, TypeScript, production build and SHA-bound Architecture Review before merge.
