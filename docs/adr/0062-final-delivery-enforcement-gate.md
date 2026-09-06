# ADR-0062 — Final delivery enforcement gate

## Status
Accepted

## Context
The 2026-09-06 real-user KNT session proved that final consistency had become diagnostically useful but was not a delivery gate. Turn 14 produced `accepted=false`, score 70 and `response_plan_content_engagement_missing`, while the same invalid candidate (`he anladım`) was still returned to the user. Current `main` confirmed that `consistency.accepted` gated language learning/metrics only; both user-facing `sendChatPayload` paths had no fail-closed branch.

This is not a regression in an existing gate. The enforcement point did not exist.

## Decision
- Add one deterministic final-delivery gate owned by the already-computed final consistency result.
- Both local-language and provider delivery paths reject `accepted=false` before `sendChatPayload`.
- A rejected candidate is retained only in KNT diagnostics and blanked from conversational persistence.
- The user event/state transition may still persist; only the invalid Kaira utterance is blocked.
- Rejection is a transport/runtime failure (`final_delivery_rejected`), not a new conversational fallback, so the gate adds no new WHAT authority.
- Existing repair/fallback logic remains responsible for producing a valid candidate before this last gate.
- No provider/API call is added by the gate.

## Consequences
A response known to violate canonical final constraints can no longer be delivered as if valid. If all existing repair/fallback paths still fail, the request fails explicitly instead of leaking a known-invalid Kaira message.

## Verification
The bounded repair was verified without provider/API calls: focused final-delivery characterization and regression tests passed, the existing 20-turn final-delivery quality regression passed, the full test suite passed, TypeScript passed, and the production build passed. Final PR CI and Architecture Review remain required before merge.