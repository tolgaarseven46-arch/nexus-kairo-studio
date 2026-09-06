# ADR-0058 — Dialogue compositional obligation preservation

## Status
Accepted

## Context
`SemanticEvent` can carry independent typed facets in the same turn: a social routine, advice request, information request, recall request, repair signal, relational act, and other canonical signals. `DialogueDecision` historically projected these into one primary `move`. A pure social routine branch ran before later substantive obligations, so compound turns such as `thanks + adviceRequested`, `agreement + information_request`, and `thanks + recall_request` collapsed to `complete_social_routine`.

The failure was reproduced deterministically on current `main` by `kairaDialogueCompositionalObligationCharacterization.test.ts`: all three compound classes lost their substantive obligation while the existing suite remained green.

## Decision
- Keep one primary `DialogueDecisionPlan.move` for compatibility with existing consumers.
- A social routine is primary only when no stronger independent typed dialogue obligation owns the turn.
- Preserve a concurrent canonical `socialRoutine` on the selected substantive plan as typed context.
- The concurrent routine is **not** a second WHAT authority and does not automatically require a second sentence or a fixed phrase.
- `answer_or_clarify` continues to own its existing typed fulfillment obligation.
- No raw-text reparse, phrase-specific classifier, or downstream semantic authority is added.
- Full weighted/compositional Social Action remains a broader model evolution; this repair only prevents loss of already-canonical concurrent facets.

## Consequences
Compound semantic turns retain their substantive obligation while preserving social context. Pure routines remain unchanged. Downstream ResponsePlan and realizer consumers continue to see one primary move.

## Verification
Verification is API-free/deterministic; no provider call is part of development or CI acceptance.

Regressions cover:
- thanks + advice request,
- agreement + information request,
- thanks + recall request,
- pure thanks control,
- plain information-request control.
