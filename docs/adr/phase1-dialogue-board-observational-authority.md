# ADR — Dialogue Board Is Observational Evidence

## Status
Accepted for Phase 1 PR-2.

## Context
Phase 0 and the mandatory red-team established that the production Dialogue Board carried direct social-move and clarification-question directives while `DialogueDecision` and `KairaResponsePlan` already own those decisions. The deterministic Phase-0 harness also substituted a simplified `CURRENT USER TURN` block, so previous GREEN results did not cover the real production Dialogue Board surface.

## Decision
`buildDialogueBoardInstruction()` is an observational projection only.

It may serialize:
- open topic markers,
- recent typed dialogue signals,
- claim provenance,
- source vs subject distinction,
- denial/opposition status,
- memory/evidence scope.

It may not select or authorize:
- social move,
- question/clarification,
- advice,
- humor/banter,
- speculation,
- response length/style.

Those decisions remain owned by `DialogueDecision` and `KairaResponsePlan`.

The Phase-0 harness now injects the real production Dialogue Board projection into the shared final-provider serializer instead of a simplified current-turn placeholder. Other production context remains intentionally outside the deterministic subset unless separately promoted.

## Authority metadata
`dialogueInstruction` moves from `mixed_unresolved` to `observational_evidence` only after the content cleanup above.

## Non-goals
- No `socialStyle` cleanup.
- No Conversation Grounding cleanup.
- No change to DialogueDecision logic.
- No change to ResponsePlan permissions.
- No provider/model behavior tuning.

## Reopen condition
Reopen this boundary if the Dialogue Board again gains a realizer-facing permission, or if a production-context compound test proves that observational board evidence can override a canonical move/permission.