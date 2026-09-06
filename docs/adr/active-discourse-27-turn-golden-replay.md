# Active Discourse — exact 27-turn real-user GoldenSession

Date: 2026-09-06
Status: Proposed

## Context

The original 27-turn real-user session exposed independent failures at Turn 3, Turn 24 and Turn 25. Subsequent bounded repairs were made in separate PRs, but the original session itself was not yet preserved as one exact regression source.

The source export contains, for every turn:

- the exact user message;
- the delivered Kaira reply from the original failing session;
- the persisted ingestion-time semantic event snapshot.

Those snapshots are evidence. Historical raw text must not be reparsed to manufacture a newer semantic truth during replay.

## Decision

Preserve the full 27-turn export as a checked-in fixture and add a GoldenSession regression around the architecture seams that the session exposed.

The same-turn emotional grounding rule is narrowed to canonical first-party events only:

- the turn must be an emotional opening;
- advice must not be requested;
- `target` must be `event`;
- `worldMemory.claims` must contain a grounded `current_user` claim.

A state-only emotional opening such as Turn 13 (`off sıkıldım`, `target=unknown`, `current_user.bored=true`) must remain eligible for bounded curiosity. A grounded event disclosure such as Turn 3 must not be asked for its missing cause again.

## Golden checkpoints

- Turn 3: grounded first-party event => `natural_reaction`, no follow-up question.
- Turn 13: state-only emotional opening => `invite_emotional_context` remains allowed.
- Turn 24: after the exact intervening session, the bounded discourse evidence surface still contains the retained Turn 3 event anchor even though Turn 24 itself has `target=unknown`.
- Turn 25: the original unsupported fabrication reply remains frozen in the fixture for the separate generated-claim provenance gate regression.

## Constraints

This change does not add a regex, raw-text semantic parser, event-key prefix matcher, persistent memory store, or second semantic authority.
