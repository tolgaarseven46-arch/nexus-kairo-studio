# Slice B — W5 fixture specification (inactive)

Date: 2026-09-18
Status: PREPARED / INACTIVE
Activation gate: W2 independent review + W3 freeze

This document defines deterministic fixtures only.
It MUST NOT be treated as W5 characterization evidence until W2 and W3 close.

## Shared fixture envelope

```ts
interface SliceBFixtureV1 {
  fixtureId: string;
  namespace: {
    environmentId: 'test';
    testRunId: string;
    serverId: string;
    roomId: string;
    kairaInstanceId: string;
  };
  participants: Array<{
    participantId: string;
    actorKind: 'human' | 'droit' | 'system';
    platformRoles: Array<'owner' | 'admin' | 'moderator' | 'member'>;
  }>;
  events: Array<{
    eventId: string;
    actorId: string;
    actorKind: 'human' | 'droit' | 'system';
    occurredAt: number;
    sourceSequence?: number;
    explicitReplyToEventId?: string;
    explicitMentionedParticipantIds?: string[];
    semanticSnapshotRef?: string;
  }>;
  fixtureMetadata: {
    lifecycleClass?: 'cold' | 'warm' | 'experienced-owner';
  };
}
```

## F-B01 cold-first-contact

Purpose:
- prove zero fabricated familiarity,
- preserve first-contact participant facts,
- explicit Kaira mention is observable only.

Expected invariants:
- no prior graph snapshot,
- no imported relationship/memory state,
- participant counters begin from fixture events only,
- no response-decision output exists.

## F-B02 warm-repeat-room

Purpose:
- prove repeated participation is objective history only.

Expected invariants:
- prior events are same namespace,
- participant continuity is stable,
- no `warm` field appears in production graph output,
- relationship state remains outside graph.

## F-B03 experienced-owner

Purpose:
- prove owner history does not become capability/decision truth.

Expected invariants:
- role owner is platform fact,
- lifecycleClass is fixture metadata only,
- frozen decision projection remains identical when only lifecycleClass changes.

## F-B04 explicit-reply-vs-inferred

Events:
- e1 by A,
- e2 by B with explicit replyTo=e1,
- inference candidate incorrectly favors C.

Expected invariants:
- explicit reply edge survives,
- inferred candidate cannot override it.

## F-B05 multi-mention-ambiguous

Events:
- A explicitly mentions B and C.

Expected invariants:
- both mention edges remain,
- no single resolved target field is emitted.

## F-B06 missing-parent

Events:
- replyTo points to deleted/missing event.

Expected invariants:
- unresolved reference recorded,
- no fabricated event/edge.

## F-B07 duplicate-identical

Input contains same eventId twice with byte-identical payload.

Expected invariants:
- one normalized event,
- counters/edges increment once.

## F-B08 duplicate-conflicting

Same eventId appears twice with conflicting payload.

Expected invariants:
- fail closed or emit typed conflict,
- never silently merge divergent payloads.

W2/W3 must choose the exact conflict contract before activation.

## F-B09 out-of-order

Same event set delivered in different arrival orders.

Expected invariants:
- normalized graph byte-equivalent,
- order follows frozen total-order contract.

## F-B10 equal-timestamp

Multiple events share occurredAt.

Expected invariants:
- sourceSequence orders when present,
- eventId final tie-break is deterministic.

## F-B11 cross-server-same-users

Same participant ids and similar event ids exist in server-A and server-B.

Expected invariants:
- no participant counter leak,
- no edge leak,
- no snapshot/hash collision.

## F-B12 cross-room-same-server

Same server and users, different rooms.

Expected invariants:
- room-local graph isolation.

## F-B13 cross-kaira-same-room

Same room and events, different Kaira instance ids.

Expected invariants:
- graph namespaces do not collide.

## F-B14 unanswered-addressed-turn

A explicitly addresses B.
Bounded observation window closes without B response.

Expected invariants:
- observable unanswered-turn evidence only,
- no motive/hostility/trust/relationship field.

## F-B15 suppression-receipt-valid

Input includes downstream suppression receipt with:
- owner,
- decisionId,
- sourceEventId,
- reasonCode,
- occurredAt.

Expected invariants:
- receipt preserved as evidence,
- graph does not recompute suppression.

## F-B16 suppression-receipt-invalid

Receipt missing owner or decisionId.

Expected invariants:
- reject/fail closed,
- no bare suppressed flag.

## F-B17 escalation-ref-only

Events carry refs to already-owned appraisal/canonical evidence.

Expected invariants:
- refs preserved,
- raw text not classified by graph,
- no graph-native escalation score.

## F-B18 semantic-ref-missing

Event has raw text in transcript storage but no semanticSnapshotRef.

Expected invariants:
- graph does not create semantic meaning,
- semantic state remains absent/unresolved.

## F-B19 replay-frozen

Replay receives frozen graph snapshot/input.

Expected invariants:
- no live platform read,
- deterministic normalized output,
- frozen schema/derivation versions retained.

## F-B20 droit-self-event

Kaira/Droit reply re-enters observation stream.

Expected invariants:
- actorKind=droit,
- event stored once,
- no trigger/answer decision generated,
- no recursion signal emitted by graph.

## Activation rule

After W2 + W3:
1. convert each fixture into typed test builders,
2. write characterization assertions first,
3. verify intended W5 REDs fail for missing implementation rather than bad fixtures,
4. only then begin W6 minimal implementation.

No fixture in this file authorizes production behavior.
