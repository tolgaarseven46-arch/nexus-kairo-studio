# ADR-0068 — Active discourse first-party event working set

Date: 2026-09-06
Status: Proposed / red characterization

## Context

The 27-turn real-user acceptance test exposed a multi-turn continuity failure:

- Turn 3 established: `sabah havuza gittim güneşin altında uyuya kalmışım sırtım yanıyor`.
- Canonical semantics carried `target=event` and `current_user.back_sunburned=true`.
- Turn 24 returned to the same lived event: `off sırtım çok pis hala`.
- Canonical semantics carried `current_user.back_discomfort=ongoing`, but the earlier event context was no longer available as active discourse evidence.

The existing `DiscourseState.openThreads` is already a bounded, session-scoped working set, but its thread ontology currently contains only `third_party_topic`. Therefore first-party/current-user event disclosures cannot enter the working set at all.

## Decision direction

Do not create a new persistent memory store and do not reparse historical raw text.

Extend the existing bounded `DiscourseState.openThreads` concept so a canonical current-user event disclosure can be retained as short-lived conversational evidence.

Initial admissibility boundary:

- canonical `target=event`;
- canonical `worldMemory.claims` contains at least one grounded `current_user` claim;
- a context-free emotional opening with no grounded event claim must not create an event thread.

The thread stores quoted ingestion-time evidence only. It remains CONTEXT, never a new semantic/decision authority.

## Deliberate non-decision

This ADR does not yet define a generic deterministic equivalence rule that claims two differently-keyed events are the same topic. In particular, it does not infer that arbitrary `current_user.*` attributes are related.

Turn 24 topic resumption/binding must be added only after the working set can safely retain the earlier first-party event evidence. No attribute-name regex, raw-text keyword matcher, or second semantic parser is permitted.

## Regression invariant

The Turn 3 canonical event disclosure must enter the bounded session discourse working set as a `user_event_topic`.

A bare context-free opening such as `moralim bozuk` must not create such a thread.
