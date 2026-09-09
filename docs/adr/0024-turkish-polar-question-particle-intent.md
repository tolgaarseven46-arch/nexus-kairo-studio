# ADR-0024 — Turkish polar-question particle intent

Status: Accepted
Date: 2026-09-09

## Context

Natural Characterization v2 exposed a recurring canonical-ingestion gap on punctuation-free Turkish polar questions such as:

- `sen sessizliği sever misin`
- `ailen var mı`
- `oraya gittin mi hiç`

The legacy semantic floor recognized explicit `?` punctuation and several interrogative words, but did not treat the productive Turkish question particle (`mi/mı/mu/mü` and common person-inflected forms) as a general question signal. As a result, otherwise ordinary questions could fall through to `general_chat` / canonical `smalltalk`.

This is an ingestion failure, not a DialogueDecision, relationship, appraisal, memory, or response-style problem.

## Decision

At the canonical semantic-ingestion boundary, add a bounded Turkish polar-question-particle signal and feed it into the existing information-request intent branch.

The signal covers standalone question particles and common person-inflected forms while requiring lexical boundaries, so substrings inside ordinary words do not count.

Examples that must classify as an information request even without `?`:

- `sen sessizliği sever misin`
- `ailen var mı`
- `oraya gittin mi hiç`
- `ben de geleyim mi`

Protected counterexamples:

- `mimik yapmak bazen komik`
- `mimar olmak zor`

## Authority boundary

This change belongs only to the canonical semantic floor that produces `SemanticInterpretation@2`. No downstream layer may reparse Turkish question morphology independently.

The change intentionally reuses the existing `information_request` semantics used by explicit question punctuation instead of introducing a second question-intent authority.

## Verification

Reported + neighbor + counterexample regressions live in `kairaTurkishQuestionParticleIntentRegression.test.ts`.

Semantic-ingestion changes remain subject to FAST Natural Characterization v2 replay and FULL CI.

## Non-goals

- no G1→G4 change;
- no RelationshipReducer change;
- no ResponsePlan heuristic;
- no speech/persona change;
- no provider/API proof;
- no broad morphological parser replacement.
