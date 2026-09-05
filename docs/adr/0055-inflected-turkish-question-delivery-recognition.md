# ADR-0055 — Recognize inflected Turkish question forms at final delivery

- Status: Accepted
- Date: 2026-09-05

## Context

Post-PR #104 live production acceptance found a remaining delivery-conformance gap:

- User: `yarın erken kalkıcam`
- Canonical plan: `allowQuestion=false`
- Delivered reply included `kaçta kalkman lazım 😅`
- Final consistency still accepted the reply.

The plan authority was correct. The existing structural Turkish question recognizer handled bare `kaç` but not common case-inflected forms such as `kaçta`, so final delivery could not enforce the already-owned plan decision.

## Decision

Extend the existing delivered-text question recognizer's `kaç` family to cover ordinary Turkish case forms used as interrogatives:

- `kaçta`
- `kaça`
- `kaçtan`

The same family is added to existing reported/embedded exclusions so declarative reported speech such as `saat kaçta olduğunu söyledi` remains non-question output.

No user-message semantic parsing, intent inference, relationship rule, or new WHAT/WHETHER authority is introduced. `KairaResponsePlan.allowQuestion` remains the sole permission owner; this recognizer only measures delivered output conformance.

## Consequences

- Punctuationless inflected `kaç` questions are enforceable at the final boundary.
- Reported/embedded forms remain protected against false positives.
- The single-semantic-authority rule remains unchanged.

## Evidence

`kairaQuestionActRecognizer.test.ts` locks the exact live `kaçta kalkman lazım 😅` surface plus `kaça` / `kaçtan` variants and reported-speech controls.
