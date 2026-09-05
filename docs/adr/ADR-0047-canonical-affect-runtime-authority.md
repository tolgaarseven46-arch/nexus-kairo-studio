# ADR-0047 — Stable character config owns affect baseline; server KDM owns canonical affect transitions

## Status
Accepted precommit — 2026-09-05

## Context
Affect had two recovery semantics in the production request path. The client temperament layer recovered anger/stress before the request and applied the current event response, then sent that mutated state to the server. The canonical server KDM/RelationshipReducer independently applied relationship recovery, affect homeostasis, and the same turn's affect transition. PR #93 made reducer homeostasis accept a typed baseline but intentionally left its owner unresolved.

Canonical identity is not the correct owner: it stores durable self-facts and autobiographical truth. `temperament.arousal.baseline` is also not the four-channel resting affect target; it is an event/arousal computation parameter.

## Decision
1. Stable character/fine-tune configuration owns Kaira's four-channel resting affect baseline: anger, stress, happiness, calmness.
2. The dedicated keys are `temperament.affectBaseline.anger`, `.stress`, `.happiness`, and `.calmness`.
3. Missing keys preserve the shipped baseline `{ anger:10, stress:20, happiness:70, calmness:70 }`.
4. `temperament.arousal.baseline` remains semantically independent and MUST NOT be reinterpreted as resting affect.
5. Server KDM/RelationshipReducer is the sole canonical authority that mutates dynamic affect state for a chat turn and performs canonical recovery/homeostasis.
6. Client temperament may project a situational state for behavior-layer synthesis, but it MUST NOT perform elapsed-time recovery on the canonical state or send that preview as `dynamicState`.
7. The client sends original canonical `dynamicState` and a separate typed `affectBaseline`; the server normalizes the baseline and passes it through the canonical KDM seam to RelationshipReducer.
8. Persistence continues to own the previous canonical dynamic state. Affect baseline is stable character configuration, not autobiographical state.

## Consequences
- One state-transition authority exists for chat affect.
- Character temperament can eventually expose personalized resting affect without changing identity truth semantics.
- Existing characters remain behavior-compatible until dedicated baseline keys are configured.
- Client behavior preview remains useful but cannot double-apply recovery or current-turn affect to persisted state.

## Regression law
The architecture fails if production `droitChatService` calls `recoverTemperamentAffect` in the canonical request path, sends `temperamentAdjustedState` as outbound `dynamicState`, derives four-axis baseline from `temperament.arousal.baseline`, or bypasses the server KDM baseline seam.
