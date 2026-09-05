# ADR-0051 — Low-load third-party emotional reconciliation

## Status
Accepted — 2026-09-05

## Context
Live production characterization after PR #100 showed provider variance for the same low-load third-party event. `Mert yine geç kaldı` was emitted with the same `target=third_party`, `emotionalLoad=0.3`, `socialRoutine=none` and `relationalAct=none`, but provider `valence` varied between `neutral` and `negative`. The previous canonical reconciliation required `valence=neutral`, so the negative variant incorrectly survived as `emotional_share`.

A genuine emotional disclosure (`Mert yüzünden çok üzgünüm`) remained compositionally distinct: high emotional load plus `socialRoutine=emotional_opening` and `relationalAct=reassurance_seek`.

## Decision
Canonical language-understanding reconciliation must not treat provider valence as sufficient evidence that a low-load third-party event is the user's emotional disclosure.

A provider `emotional_share` is reconciled to ordinary smalltalk when all of the following typed conditions hold:
- `target=third_party`;
- `emotionalLoad <= 0.35`;
- `socialRoutine=none`;
- `relationalAct=none`;
- no meaningful support or affection signal.

The rule consumes only `SemanticInterpretation@2` fields at the existing canonical language-understanding gateway. It does not inspect or reparse raw text downstream.

Genuine emotional openings remain protected by higher emotional load and/or explicit emotional/relational discourse facets.

## Consequences
- Provider drift between neutral and mildly negative valence cannot change the conversational class of the same low-load third-party event.
- Genuine emotional disclosures remain `emotional_share`.
- No second semantic parser or downstream raw-text authority is introduced.
- Regression coverage must lock both the neutral and negative low-load variants and a genuine high-load emotional-opening counterexample.
