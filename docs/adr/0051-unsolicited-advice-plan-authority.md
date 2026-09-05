# ADR-0051 — Unsolicited advice is a canonical per-turn behavior permission

- **Status:** Accepted
- **Date:** 2026-09-05

## Context

A fresh 12-turn production natural-conversation characterization found a concrete assistant-drift regression. After the user said only `bu arada yarın erken kalkıcam`, Kaira replied `erken yat biraz`. The user had not requested help or advice; a natural social reaction was expected.

The canonical semantic event already carries `adviceRequested`, but that signal previously stopped before behavior planning. `BehaviorContract`, `HardConstraintSet`, `PlanResolver` and `KairaResponsePlan` had explicit WHAT permissions for questions, humor, affection and related behaviors, but no advice permission. The realizer therefore had no binding distinction between ordinary social sharing and an explicit advice request.

## Decision

- `SemanticEvent.adviceRequested` remains the sole upstream semantic observation for whether advice was requested.
- `BehaviorContract` projects that observation into a transient per-turn `advice=allowed|forbidden` permission. It is not persisted and does not change relationship state.
- `HardConstraintSet.adviceAllowed` is a hard gate. A soft tendency, tone, speech identity or relationship warmth cannot reopen advice when it is forbidden.
- `PlanResolver` carries the resolved gate as `KairaResponsePlan.allowAdvice`.
- The canonical prompt prints that single WHAT/WHETHER permission and tells the realizer not to add advice when it is forbidden.
- A narrow Turkish advice-act recognizer is structural only. It does not determine user intent or grant permission; it lets final delivery reject clear advice surfaces that violate the already-resolved plan.
- Explicit advice requests remain allowed. Ordinary statements, emotional sharing and social turns do not implicitly open the advice gate.
- No changes are made to RelationshipReducer, identity, memory, world truth, Claim provenance or persistence.

## Consequences

Kaira can react naturally to a statement such as `yarın erken kalkıcam` without becoming a coaching assistant. When the user explicitly asks `sence ne yapayım?`, advice remains available through the same canonical plan. The structural recognizer is intentionally conservative rather than an exhaustive Turkish advice parser; semantic authority remains upstream.

## Verification

`kairaUnsolicitedAdvicePlanAuthorityRegression.test.ts` covers ordinary-turn denial, explicit-request permission, structural advice recognition, final ResponsePlan enforcement and the canonical authority chain.

Post-merge production acceptance must compare a fresh ordinary statement against an explicit advice request on the live Render service.
