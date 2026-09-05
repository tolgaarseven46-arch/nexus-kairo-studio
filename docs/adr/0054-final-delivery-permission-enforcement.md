# ADR-0054 — Enforce plan-owned question and advice permissions at final delivery

- Status: Accepted
- Date: 2026-09-05

## Context

Fresh post-PR #101 production characterization showed two delivery failures even though the canonical response plan was already correct.

1. `bu arada Mert yine geç kaldı` produced a grounded reaction plus a follow-up question while `allowQuestion=false`. The validator detected `response_plan_question_blocked`, but the invalid candidate still reached delivery because the legacy `natural_reaction` fallback was a generic acknowledgement that failed the separate `engage_user_content` obligation.
2. `yarın erken kalkıcam` and `bugün çok yoruldum` produced advice-like surfaces (`...geçmen lazım`, `...dinlen bence`) while `allowAdvice=false`. The existing structural advice recognizer did not cover those measured Turkish forms, so final validation accepted them.

The broken authority was not semantic interpretation or planning. The first broken boundary was final-delivery conformance to already-owned ResponsePlan permissions.

## Decision

### Forbidden questions

The final-delivery constraint pass may deterministically remove structurally recognized question units from a multi-unit candidate when:

- `KairaResponsePlan.allowQuestion=false`, and
- at least one non-question unit remains.

It uses the existing Turkish question-act recognizer. It does not inspect user semantics and does not invent replacement content. If the entire candidate is a question, it remains invalid so the normal repair/fallback path owns recovery.

### Forbidden unsolicited advice

The existing Turkish advice-act recognizer is extended only with production-measured structural forms:

- necessity constructions such as `... geçmen/yapman/gitmen/... lazım`,
- clear imperative sleep/rest surfaces such as `dinlen`, `uyu`, `yat`, including `... bence`.

The recognizer remains a delivered-text structural guard. `KairaResponsePlan` remains the sole authority deciding whether advice is allowed.

## Consequences

- A valid grounded reaction is no longer discarded merely because a later forbidden follow-up question was generated.
- Question enforcement deletes prohibited output but does not author new semantic content.
- Measured unsolicited-advice variants are rejected by the existing plan conformance path.
- No new semantic parser, relationship rule, or second WHAT/WHETHER authority is introduced.

## Evidence

`kairaPost101DeliveryPermissionRegression.test.ts` locks the exact production-shaped question and advice surfaces plus non-advice/all-question controls.
