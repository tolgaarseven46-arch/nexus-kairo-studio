# ADR-0059 — Dialogue fulfillment obligation coverage

## Status
Accepted

## Context
`DialogueDecision` owns the semantic WHAT of a turn and downstream validators are not allowed to invent independent fulfillment rules. `answer_or_clarify` already carried an explicit decision-owned obligation that prevents acknowledgement-only delivery, but `grounded_recall` did not. This left a substantive recall request able to pass final validation as `tamam`, `peki`, `aynen` or `anladım` even though grounded recall already has deterministic content/fallback semantics.

An API-free characterization on current `main` reproduced the gap: the recall obligation was undefined and acknowledgement-only delivery produced no issue, while the pure-social control remained valid. The rest of the suite stayed green.

## Decision
- Generalize `DialogueObligation.type` to cover `answer_or_clarify` and `grounded_recall`.
- Both substantive moves forbid `acknowledgement_only` closure through the same decision-owned fulfillment contract.
- `findDialogueDecisionIssues` consumes the obligation type generically instead of hard-coding `answer_or_clarify`.
- Pure social routines remain obligation-free.
- Existing grounded-recall claim ledger and deterministic fallback remain the sole content authority for recall; this change adds no second WHAT authority.
- No raw-text reparse, phrase-specific classifier, provider call, or live smoke is introduced.

## Consequences
A grounded recall can no longer silently collapse to a generic acknowledgement at final delivery. Existing answer obligations retain their exact behavior and social-only turns remain unchanged.

## Verification
API-free deterministic coverage includes the original red characterization, a dedicated regression, existing final-delivery obligation regression, full test suite, TypeScript and production build. Final PR CI is required to repeat repository governance and build gates on the committed repair.
