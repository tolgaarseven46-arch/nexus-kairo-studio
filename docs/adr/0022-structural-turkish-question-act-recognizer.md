# ADR-0022: Structural Turkish question-act recognition is a delivery validator, not a behavior authority

## Status
Accepted

## Context
Fresh production chat exposed punctuationless Turkish questions while `ResponsePlan.allowQuestion=false`, first with `kimle oynuyorlar şu an` / `skor ne şu an`, then with embedded-clause realizations such as `oh mis hangi maçı açtın`, `kim önde şu an`, and `ne yapasın var`. The policy authority was correct; generated-output structural recognition was incomplete.

## Decision
Generated-output question recognition lives in a named deterministic structural recognizer. `ResponsePlan` remains the sole WHAT/WHETHER authority for whether Kaira may ask a question; the recognizer only measures whether the realized Turkish output performs a question act.

The recognizer supports punctuation, Turkish question clitics, strong interrogative pronouns anywhere in an unre­ported clause, common punctuationless predicate forms, and reported/indirect-question exclusions. It must not inspect user semantics, relationship state, or decide policy.

Embedded WH forms are treated as question acts only after reported-speech / subordinate-complement exclusions are applied. This allows colloquial realizations such as `skoru yaz bakalım kim önde` to be rejected when questions are forbidden without turning `kim önde diye anlattı` or `hangi maçı açtığını anlattı` into false positives.

## Consequences
- `allowQuestion=false` enforcement no longer depends on phrase order or a short list of sentence prefixes.
- Fresh production escapes including embedded `kim`, `hangi`, and `ne` clauses are covered by golden regressions.
- Reported/declarative forms remain non-question output.
- Future linguistic improvements belong in this structural recognizer, not in ResponsePlan policy logic.
