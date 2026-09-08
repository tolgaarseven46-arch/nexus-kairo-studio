# ADR-0085: Stable autobiographical participant identity

- Status: Accepted
- Date: 2026-09-08

## Context

Canonical entity resolution uses `current_user` as a turn-local grounding alias for the active speaker. That alias is valid inside one interaction, but lived-memory consolidation previously copied actor/target ids directly into `KairaAutobiographicalMemory.participantIds`.

Autobiographical memory belongs to the Kaira instance identity and is not partitioned by the active user. Consequently, two different users interacting with the same Kaira instance could both be persisted as participant `current_user`, collapsing distinct people into one durable identity.

World observations already carry a normalized `userId` and are partitioned by user × Kaira-instance ownership. The consolidation boundary therefore has enough typed provenance to turn the local alias into a stable persistent participant identity without changing language understanding or entity grounding.

## Decision

`current_user` remains a turn-local entity-resolution alias. It MUST NOT be persisted as an autobiographical participant id.

At the world-observation → autobiographical-memory boundary:

- actor/target id `current_user` is projected to `user:<WorldEventObservation.userId>`;
- Kaira self ids remain excluded from `participantIds`;
- named/non-local participant ids are preserved unchanged;
- duplicate participant ids are removed;
- no raw-text reparsing or name inference is allowed.

The `user:` namespace distinguishes durable user-owned participant identities from ordinary canonical entity ids.

Existing legacy autobiographical memories containing bare `current_user` are ambiguous. This change does not guess which historical user they belong to and does not silently migrate them. New writes are corrected at the authority boundary; any future migration must use independent ownership provenance.

## Authority map

Entity resolution owns turn-local referents, including the `current_user` alias.

`WorldEventObservation.userId` owns the persisted observation's user scope.

Lived-memory consolidation owns the projection from observation provenance into durable autobiographical participant ids; it does not reinterpret event meaning.

`KairaAutobiographicalMemory` remains the canonical typed autobiographical record for the Kaira instance.

## Consequences

Different users can no longer collapse into the same persistent autobiographical participant solely because both were the active speaker in their own turns.

Future autobiographical recall or SocialAppraisal memory joins may safely use participant ids for newly consolidated memories without treating `current_user` as a global person identity.

Turn-local behavior and canonical event semantics remain unchanged.

## Regression proof

`src/services/kairaLivedMemoryParticipantIdentityNeighborProofRegression.test.ts` is the historical RED→GREEN proof against pre-fix main `a8cc3a990a9a10510645758ed647c4dbb6d4fdae`.

The reported and neighboring cases require current-user actors/targets to become user-scoped persistent participant ids. The counterexample proves that a named third-party participant remains unchanged.
