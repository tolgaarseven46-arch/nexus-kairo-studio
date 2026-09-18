# Slice B — W3 freeze draft + W4 test map

Date: 2026-09-18
Status: DRAFT ONLY — blocked by W2 independent red-team
Scope: Conversation Graph observational evidence

## W3 freeze draft

This document is intentionally non-authoritative until W2 independent findings are resolved and Tolga freezes the product boundary.

### Candidate ConversationGraphV1

```ts
type ConversationActorKind = 'human' | 'droit' | 'system';

interface ConversationGraphNamespaceV1 {
  environmentId: 'test' | 'staging' | 'live-beta';
  testRunId?: string;
  serverId: string;
  roomId: string;
  kairaInstanceId: string;
}

interface ConversationParticipantV1 {
  participantId: string;
  actorKind: ConversationActorKind;
  platformRoles: Array<'owner' | 'admin' | 'moderator' | 'member'>;
  firstSeenAt: number;
  lastSeenAt: number;
  messageCount: number;
}

interface ConversationEventV1 {
  eventId: string;
  actorId: string;
  actorKind: ConversationActorKind;
  occurredAt: number;
  sourceSequence?: number;
  semanticSnapshotRef?: string;
}

interface ExplicitReplyEdgeV1 {
  fromEventId: string;
  toEventId: string;
  source: 'platform';
}

interface ExplicitMentionEdgeV1 {
  fromEventId: string;
  toParticipantId: string;
  source: 'platform';
}

interface InferredAddressCandidateEdgeV1 {
  fromEventId: string;
  toParticipantId: string;
  confidence: number;
  ruleId: string;
  evidenceEventIds: string[];
}

interface UnresolvedReferenceV1 {
  sourceEventId: string;
  referenceType: 'reply' | 'mention' | 'participant';
  referencedId: string;
}

interface UnansweredAddressedTurnEvidenceV1 {
  addressedEventId: string;
  addresseeId: string;
  windowStart: number;
  windowEnd: number;
  observedEventIds: string[];
}

interface SuppressionReceiptV1 {
  decisionId: string;
  owner: string;
  sourceEventId: string;
  reasonCode: string;
  occurredAt: number;
}

interface EscalationEvidenceRefV1 {
  eventId: string;
  evidenceOwner: string;
  evidenceRef: string;
}

interface ConversationGraphV1 {
  schemaVersion: 1;
  derivationVersion: string;
  namespace: ConversationGraphNamespaceV1;
  conversationId: string;
  participants: ConversationParticipantV1[];
  events: ConversationEventV1[];
  explicitReplyEdges: ExplicitReplyEdgeV1[];
  explicitMentionEdges: ExplicitMentionEdgeV1[];
  inferredAddressCandidateEdges: InferredAddressCandidateEdgeV1[];
  unresolvedReferences: UnresolvedReferenceV1[];
  unansweredAddressedTurnEvidence: UnansweredAddressedTurnEvidenceV1[];
  suppressionReceipts: SuppressionReceiptV1[];
  escalationEvidenceRefs: EscalationEvidenceRefV1[];
  builtFromEventIds: string[];
  snapshotHash: string;
}
```

### Frozen-boundary candidate rules

1. Explicit platform reply/mention facts outrank inferred graph candidates.
2. Conversation Graph never emits canonical semantic truth.
3. Conversation Graph never decides WHETHER/WHAT Kaira says.
4. Conversation Graph never grants/revokes platform capabilities.
5. Conversation Graph never mutates relationship/appraisal/memory truth.
6. `unansweredAddressedTurnEvidence` records absence-of-reply only; no motive attribution.
7. `suppressionReceipts` are accepted only from an owning decision layer.
8. `escalationEvidenceRefs` only reference already-owned evidence; no raw-text classifier exists in graph.
9. Cold/warm/experienced-owner are test fixture classes only, never production graph fields.
10. Total order is `occurredAt -> sourceSequence? -> eventId`.
11. Duplicate `eventId` ingestion is idempotent.
12. Graph namespace is environment/testRun/server/room/Kaira-instance scoped.
13. Replay reads only frozen graph snapshot/input and never live platform state.
14. Human/droit/system actor kind is explicit platform-owned identity evidence.
15. Missing references remain unresolved; they are never fabricated.

### W3 unresolved items reserved for W2

Independent reviewer may still require removing or relocating:
- inferred address candidates,
- unanswered-turn evidence,
- escalation evidence refs,
- participant counters/timestamps.

If W2 marks any of these BLOCKER, W3 must resolve them before freeze.

## Candidate fixture definitions

### cold
A deterministic test fixture with:
- no prior graph snapshot,
- no imported relationship/memory state,
- zero prior room events for the fixture participants.

### warm
A deterministic test fixture with:
- prior graph events in the same namespace,
- no implication of relationship closeness,
- only objective prior participation evidence.

### experienced-owner
A deterministic test fixture where:
- platform role is owner,
- prior room/server-management events exist as fixture evidence,
- fixture class does not grant capabilities,
- fixture class does not alter response/behavior decision inputs.

These labels are test metadata only.

## W4 draft test map

### T-B01 explicit reply precedence
Given an explicit reply edge and conflicting inferred candidate, explicit reply remains authoritative graph fact.

### T-B02 multi-mention ambiguity
Multiple explicit mentions are all preserved; graph does not collapse them into one target.

### T-B03 missing parent
Missing reply target creates unresolved reference; no parent event is invented.

### T-B04 duplicate event
Reingesting the same eventId leaves graph snapshot unchanged.

### T-B05 out-of-order determinism
Different arrival order produces byte-equivalent normalized graph snapshot.

### T-B06 source-sequence tie break
Equal timestamps with sourceSequence sort identically across replay/live fixture.

### T-B07 eventId final tie break
Equal timestamp and absent/equal sourceSequence uses eventId deterministically.

### T-B08 cross-server zero leak
Same users/events in server A and B never share edges/counters/snapshots.

### T-B09 cross-room zero leak
Same server, different rooms remain isolated.

### T-B10 cross-Kaira zero leak
Same room with different Kaira instances remains isolated where namespace requires it.

### T-B11 replay parity
Frozen graph snapshot replay yields byte-equivalent graph result with zero live fetch.

### T-B12 replay live-state denial
Replay path rejects any live platform read/mutation request.

### T-B13 unanswered-turn no-motive
Unanswered evidence contains only bounded observation facts and no intent/hostility/relationship field.

### T-B14 suppression ownership
Graph rejects suppression receipt without owner + decisionId + sourceEventId.

### T-B15 escalation no-text-reinterpretation
Graph cannot derive escalation from raw text; only owned evidence refs are accepted.

### T-B16 fixture neutrality
cold/warm/experienced-owner fixture labels cannot alter a frozen decision projection when all owned decision inputs are held constant.

### T-B17 participant fact purity
Participant node contains platform/objective counters only; no inferred personality/trust/toxicity/demographic fields.

### T-B18 self-event non-recursion
Kaira/Droit self event is stored as observation and emits no trigger/answer decision.

### T-B19 semantic authority non-invention
Graph input with no semanticSnapshotRef remains without semantic truth; raw text is not reclassified.

### T-B20 snapshot provenance
schemaVersion/derivationVersion/namespace/builtFromEventIds/snapshotHash are required and validated.

## W5 entry criteria

W5 characterization RED may begin only when:
- W2 independent reviewer findings are attached to issue #298,
- all W2 BLOCKERs are resolved,
- Tolga freezes W3,
- the exact field set above (or its W2-revised form) is marked authoritative.

Until then this file is planning evidence only.
