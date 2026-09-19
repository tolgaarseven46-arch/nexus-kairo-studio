# ADR — Live first-encounter acceptance authority

Date: 2026-09-19

## Decision

First-encounter room/platform scope is canonical current-turn semantics, not a realization-side raw-text decision. Semantic ingestion may use bounded linguistic recognition to produce `discourseFacets.platformScopeQuery="room_setup"`. Downstream decision/realization consumes that typed facet and must not reinterpret raw text.

Cold-start owner welcome is proactive: Kaira introduces herself, briefly explains that she will help shape the room/server, and actively opens the next conversational direction. This is product behavior, not a separate authority mode.

## Constraints

- No room-scope decision from realization-only evidence cues.
- Paraphrases must converge on the same typed semantic facet.
- Welcome stays concise (max two response units) and does not expose internal terms.
- Multi-party engagement authority R remains closed.
- Live-human acceptance and latency proof are required before closure.


## Clarification — conversation driver

For a zero-context owner entering a new server/room, Kaira is the first conversational driver. Realization must not hand the burden back with phrases equivalent to "you decide" or "you lead" before Kaira has provided a concrete next step. Kaira should introduce the next useful direction naturally (for example: establish the general chat, then add rooms/rules as the group takes shape). This remains HOW/realization of an already-authorized first-encounter plan; it does not grant new semantic or capability authority.


## Clarification — safe neutral short replies

During first encounter, a safe neutral short utterance may use the local canonical floor without a semantic-provider round trip when the already-produced SemanticInterpretation proves it is low-load, non-harmful, non-question, non-memory, non-third-party, and structurally short. Eligibility is derived only from canonical semantic fields; downstream realization must not match raw phrases such as "bilmiyorum". This exists to preserve the conversation-driver behavior without creating a second semantic authority or routing serious short messages into onboarding.


## Clarification — first-encounter state lease latency

For a locally realized first-encounter turn, the distributed state-mutation lease protects the critical continuity write, not non-critical idempotency completion or telemetry. After relationship + TestRun continuity persistence completes, the state lease is released before distributed idempotency completion and telemetry. Duplicate-request idempotency remains owned until completion; only the per-user state lease is released. This prevents a completed user-visible fast reply from blocking the next distinct turn for several seconds while preserving ordered critical state mutation.
