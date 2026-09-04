# ADR-0024: Deep persistent recall window only for grounded recall

- Status: Accepted
- Date: 2026-09-04

## Context

The post-PR #48 long-session investigation confirmed that real product chat sends only the last 24 messages to `/api/chat`, while the fast persistent-memory path loads only the six most recent persisted KDM memories. A fact introduced early in a 20+ turn session can therefore fall out of both windows even though it is still present in persistence.

The measured Mert recall loss is therefore a real product retrieval gap, not a test-harness artifact.

## Decision

Keep normal social turns on the existing six-item cached persistent-memory window.

When the canonical dialogue move is `grounded_recall`, allow a deeper persisted-memory scan of 40 KDM memory records, then apply the existing `validateMemoryAgainstMessage` topical-anchor gate before any memory is exposed to the response model.

The persistence loader may read up to 100 records so future explicit retrieval policies can choose an appropriate bounded depth without changing storage semantics.

## Authority boundary

- The deeper scan is activated only by the canonical dialogue decision; raw text does not independently select the deep path.
- Deep retrieval does not make a memory true. Existing relevance validation and fact-confidence metadata remain in force.
- Normal turns keep the small cached window, so latency and irrelevant-memory exposure do not increase globally.
- This does not alter relationship state, semantic interpretation, dialogue move selection, or response-plan authority.

## Consequences

- Explicit long-range recalls such as `Mert yarın ne yapacaktı?` can recover persisted evidence after it falls out of the 24-message request history and six-item recent-memory cache.
- Fresh social/emotional turns do not pay the cost of a deep memory scan.
- PR #48 topical-anchor protection continues to filter the deeper candidate set before model visibility.
