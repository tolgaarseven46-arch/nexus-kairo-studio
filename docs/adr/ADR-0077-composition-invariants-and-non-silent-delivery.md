# ADR-0077: Cross-layer composition invariants and non-silent final delivery

- Status: Accepted
- Date: 2026-09-07

## Context

Fresh post-PR138 KNT characterization exposed three neighboring failures after individually-correct fixes had already landed:

1. a reciprocal `what_doing` facet could still survive with `target=unknown`, even though PR136 had closed only the `third_party` case;
2. `allowQuestion=false` could miss a natural Turkish surface such as `ne tarz açıyosun şimdi`, while a neighboring `mi/mı` question was detected;
3. when final delivery rejected the surviving candidate, the persisted assistant reply was an empty string.

The common failure is not a broken semantic core. It is incomplete cross-field and cross-layer composition: a narrow repair encoded one observed value combination while the invariant itself remained implicit.

## Decisions

### 1. Reciprocal routine projection is target-invariant

`how_are_you` and `what_doing` are Kaira-facing reciprocal routines. They may be projected downstream only when canonical `target === kaira`. Every other target class (`current_user`, `third_party`, `event`, `unknown`) fails closed to `socialRoutine=none`.

This is a deterministic projection constraint. It does not reparse raw text or invent a new intent.

### 2. Question realization uses structural morphology, not bare-token widening

The output question recognizer must not classify bare `ne` as a question globally. It may recognize `ne` when it heads a short phrase with a second-person predicate, covering surfaces such as `ne tarz açıyosun şimdi` while leaving exclamations (`ne güzel`) and idioms (`ne bileyim`) untouched.

This remains a realization validator, not semantic authority.

### 3. Partial delivery repair preserves valid units

When questions are forbidden, an otherwise-valid social reaction must not be discarded merely because a forbidden follow-up question shares the same orthographic sentence. Semicolon and colon clause boundaries are eligible deterministic response-unit boundaries in addition to sentence/newline boundaries.

### 4. Rejected turns are never persisted as empty assistant messages

Final delivery remains fail-closed: rejected candidates stay rejected and their issues remain visible. However, after all normal repair/fallback paths are exhausted, the delivery gate persists a neutral operational fallback rather than an empty string.

The fallback must contain no domain/world/relationship claim, no question, no advice, no affection, and no humor. It is operational resilience, not semantic recovery.

## Invariants

- Reciprocal social routine => canonical target must be Kaira at downstream projection.
- `allowQuestion=false` => recognized question units must not survive if a valid non-question unit exists.
- Final `accepted=false` must never imply `persistedReply.trim() === ""`.
- Rejection fallback does not change `accepted=false` to true.
- No person/name-specific rule is introduced.
- No raw user-text classifier is added downstream.

## Verification

`kairaCompositionInvariantRegression.test.ts` locks:

1. all non-Kaira targets suppress reciprocal routines;
2. Kaira target preserves them;
3. `ne + short phrase + second-person predicate` is recognized without treating all bare `ne` surfaces as questions;
4. valid social reaction survives removal of a semicolon-separated forbidden question;
5. rejected final delivery persists a non-empty neutral fallback while staying rejected.

The PR must pass architecture contracts, autonomous runtime contracts, beta gates, full Vitest, TypeScript, production build, docs/behavior guards and Architecture Review before merge.
