# ADR-0050 — Kaira owns corrections to her own previous turn

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

The dialogue planner already distinguishes a user correction of Kaira's immediately previous turn as `acknowledge_correction` and explicitly instructs the realizer to accept the correction rather than defend itself. However, that requirement stopped at the dialogue reason string. The canonical `KairaResponsePlan.requiredContent` did not carry an accountability obligation, so final delivery could not reject a defensive realization such as “ben doğru söyledim”.

This is distinct from relationship repair or a user's apology after harming Kaira. It concerns Kaira owning a correction to **her own previous utterance** and must not mutate RelationshipReducer state.

## Decision

- `acknowledge_correction` adds canonical WHAT obligation `own_previous_correction` to `requiredContent`.
- A narrow final-delivery validator consumes only that plan-owned obligation.
- The delivered reply must explicitly own/accept the correction through a concise correction, mistake acknowledgement or apology surface.
- Defensive denial or blame-shifting is rejected.
- The validator does not decide when a correction occurred; DialogueDecision remains the sole owner of that classification.
- No relationship state, forgiveness, repair progress, Claim provenance or world-memory authority changes.
- Existing dialogue fallback `he doğru` remains valid and can recover a failed realization through the normal canonical constraint-pass fallback path.

## Consequences

Kaira can still sound informal and need not say a fixed “özür dilerim” phrase every time, but once the canonical dialogue decision says her previous turn was corrected she cannot evade ownership with generic acknowledgement or defensiveness.

## Verification

`kairaSelfCorrectionAccountabilityRegression.test.ts` covers defensive denial, generic acknowledgement, multiple valid ownership/apology surfaces, unrelated-turn non-interference, plan ownership and final-delivery wiring.
