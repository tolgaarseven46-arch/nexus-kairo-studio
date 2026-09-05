# ADR-0022: Structural Turkish question-act recognition is a delivery validator, not a behavior authority

## Status
Accepted

## Context
Fresh production chat still exposed punctuationless Turkish questions while `ResponsePlan.allowQuestion=false`, including `kimle oynuyorlar şu an` and `skor ne şu an`. The existing detection logic lived inline in `kairaResponsePlan.ts` and had grown through several phrase-level patches.

## Decision
Move generated-output question recognition into a named deterministic structural recognizer. `ResponsePlan` remains the sole WHAT/WHETHER authority for whether Kaira may ask a question; the recognizer only measures whether the realized Turkish output performs a question act.

The recognizer must support punctuation, Turkish question clitics, interrogative case forms, common punctuationless predicate forms, and reported/indirect-question exclusions. It must not inspect user semantics, relationship state, or decide policy.

## Consequences
- `allowQuestion=false` enforcement no longer depends on an expanding regex block inside the plan-authority module.
- Fresh production escapes such as `kimle oynuyorlar şu an` and `skor ne şu an` are covered by regression tests.
- Reported/declarative forms such as `skor ne durumda diye anlattı` and `kimle oynadığını anlattı` remain non-question output.
- Future linguistic improvements belong in this structural recognizer, not in ResponsePlan policy logic.
