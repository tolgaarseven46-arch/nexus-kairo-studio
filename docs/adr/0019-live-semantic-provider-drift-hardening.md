# ADR-0019: Live semantic-provider drift hardening

- Status: Accepted
- Date: 2026-09-04

## Context

ADR-0017 defined a deterministic nine-family field-quality contract for `SemanticInterpretation@2`, and ADR-0018 exposed the exact live canonical snapshot/source in KNT. A production smoke run against the deployed `/api/language-understanding` boundary then measured the actual OpenRouter-backed provider rather than recorded fixtures.

Six of nine canonical families matched the contract. Three live drifts were observed:

1. `bu cevap saçma olmuş` was emitted as `discourseAct:correction` with `repairSignal:clarification_request`, manufacturing repair semantics from a generic complaint;
2. `Mert bana salak dedi` preserved `target:third_party` but dropped the reported `insult` social act;
3. lone target-ambiguous `salak` preserved `primaryIntent:other`, `target:unknown` and no insult act, but emitted only `uncertainty.overall:0.60`, below the deliberately wide candidate-only uncertainty contract.

The same smoke also exposed a schema-consistency smell: `soru sorma artık` correctly produced `stopQuestions:true`, `stopTalking:false` and `stopRequest:false`, but still included `secondarySocialActs:["stop_request"]`.

## Decision

Fix these defects only at the semantic-provider boundary. Downstream KDM, relationship, dialogue, repetition and emotional-load policy remain unchanged.

### Deterministic provider invariants

After schema normalization but before returning the canonical provider interpretation:

- `repairSignal` is allowed only when a prior assistant/Kaira turn exists **and** `discourseAct === "confusion_or_challenge"`; otherwise it is normalized to `none`.
- `stopRequest` is normalized to exactly `discourseFacets.stopTalking`.
- `secondarySocialActs:"stop_request"` is removed whenever `stopTalking` is false.

These are field-consistency invariants; they do not inspect raw text and therefore do not create a second parser.

### Prompt hardening

The provider prompt is strengthened with measured counterexamples:

- generic complaint `bu cevap saçma olmuş` must remain complaint/challenge with `repairSignal:none`;
- reported third-party insult keeps `target:third_party` **and** the reported `insult` social act, without becoming a Kaira-directed attack;
- lone target-ambiguous insult candidates require deliberately wide uncertainty (`overall >= 0.70`, `target >= 0.80`) and cautious disrespect severity;
- question-only stop language may not emit the full-conversation `stop_request` social act.

## Authority invariant

`SemanticInterpretation@2` remains the single semantic authority. This ADR does not authorize downstream reparsing, heuristic recovery or policy compensation for provider mistakes. Producer prompt/schema normalization owns producer quality.

## Verification

- Permanent regression: `src/services/kairaSemanticProviderLiveDriftRegression.test.ts`.
- Existing ADR-0017 nine-family matrix remains unchanged as the acceptance target.
- After merge/deploy, repeat the same live production smoke before declaring the measured drift closed.
