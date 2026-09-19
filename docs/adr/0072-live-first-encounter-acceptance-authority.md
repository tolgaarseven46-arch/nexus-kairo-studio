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
