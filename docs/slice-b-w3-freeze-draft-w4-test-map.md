# Slice B — W3 freeze draft + W4 test map

Date: 2026-09-18
Status: DRAFT ONLY — blocked by W2 independent red-team
Scope: Conversation Graph observational evidence

## W3 freeze draft

This document is intentionally non-authoritative until W2 independent findings are resolved and Tolga freezes the product boundary.

### Candidate ConversationGraphV1

```ts
type ConversationActorKind = 'human' | 'droit' | 'system';

interface ConversationGraphNamespaceBaseV1 {
  serverId: string;
  roomId: string;
  kairaInstanceId: string;
}

type ConversationGraphNamespaceV1 =
  | (ConversationGraphNamespaceBaseV1 & {
      environmentId: 'test';
      testRunId: string;
    })
  | (ConversationGraphNamespaceBaseV1 & {
      environmentId: 'staging' | 'live-beta';
      testRunId?: string;
    });

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
  referenceType: 'reply' | 'mention' | 'participant' | 'escalation_evidence';
  referencedId: string;
}

type RegisteredDecisionOwnerId = string & {
  readonly __registeredDecisionOwnerId: unique symbol;
};

interface SuppressionReceiptV1 {
  decisionId: string;
  ownerId: RegisteredDecisionOwnerId;
  ownerRegistryVersion: string;
  ownerAttestationRef: string;
  sourceEventId: string;
  reasonCode: string;
  occurredAt: number;
}

interface EscalationEvidenceRefV1 {
  eventId: string;
  evidenceOwnerId: string;
  evidenceRef: string;
  evidenceHash: string;
}

interface FrozenSemanticSnapshotEvidenceV1 {
  semanticSnapshotRef: string;
  snapshotHash: string;
  canonicalSnapshot: unknown;
}

interface ConversationGraphReplayBundleV1 {
  graph: ConversationGraphV1;
  frozenSemanticSnapshots: FrozenSemanticSnapshotEvidenceV1[];
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
  suppressionReceipts: SuppressionReceiptV1[];
  escalationEvidenceRefs: EscalationEvidenceRefV1[];
  builtFromEventIds: string[];
  snapshotHash: string;
}

interface ConversationGraphEvidenceViewV1 {
  schemaVersion: 1;
  namespace: ConversationGraphNamespaceV1;
  conversationId: string;
  participants: ConversationParticipantV1[];
  events: ConversationEventV1[];
  explicitReplyEdges: ExplicitReplyEdgeV1[];
  explicitMentionEdges: ExplicitMentionEdgeV1[];
  unresolvedReferences: UnresolvedReferenceV1[];
}
```

### Frozen-boundary candidate rules

1. Explicit platform reply/mention facts outrank inferred graph candidates.
2. Conversation Graph never emits canonical semantic truth.
3. Conversation Graph never decides WHETHER/WHAT Kaira says.
4. Conversation Graph never grants/revokes platform capabilities.
5. Conversation Graph never mutates relationship/appraisal/memory truth.
6. `unansweredAddressedTurnEvidence` is deliberately excluded from the persisted production graph until R is formally reopened.
7. `suppressionReceipts` are accepted only after ownerId is authenticated against a versioned registered-decision-owner registry; structural presence alone is insufficient.
8. `escalationEvidenceRefs` are accepted only when the referenced owned evidence resolves and its hash matches; unresolved refs move to `unresolvedReferences` with `referenceType='escalation_evidence'`.
9. Cold/warm/experienced-owner are test fixture classes only, never production graph fields.
10. Total order is `occurredAt -> sourceSequence? -> eventId`; eventId comparison is locale-independent byte/codepoint ordering.
11. Duplicate `eventId` ingestion is idempotent.
12. Graph namespace is environment/testRun/server/room/Kaira-instance scoped; `environmentId='test'` requires `testRunId` by type.
13. Replay consumes only `ConversationGraphReplayBundleV1`; all referenced semantic snapshots are frozen inside the bundle and live semantic-store resolution is forbidden.
14. Human/droit/system actor kind is explicit platform-owned identity evidence.
15. Missing references remain unresolved; they are never fabricated.
16. Decision/behavior code must not import or consume raw `ConversationGraphV1`; downstream access is through the explicit `ConversationGraphEvidenceViewV1` whitelist adapter.
17. The evidence view intentionally excludes inferred address candidates, suppression receipts and escalation refs from generic decision/behavior consumption.

### W3 unresolved items reserved for W2

W2 resolution applied:
- inferred address candidates remain internal observational graph evidence but are excluded from the generic downstream evidence view;
- unanswered-turn evidence is removed from the persisted production graph and deferred until R is formally reopened;
- escalation refs remain observational only and require owned-evidence resolution + hash validation before admission;
- participant counters/timestamps remain objective observation facts, with retention/TTL policy required before broader rollout.

The remaining freeze gate is an independent re-review of these blocker repairs.

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
Frozen replay bundle yields byte-equivalent graph result with zero live platform or semantic-store fetch.

### T-B12 replay live-state denial
Replay path rejects any live platform read/mutation request and any live semanticSnapshotRef resolution.

### T-B13 R-scope exclusion
Persisted production graph schema contains no unanswered-addressed-turn evidence until R is formally reopened.

### T-B14 suppression ownership authenticity
Graph rejects suppression receipt unless ownerId resolves in the registered decision-owner registry and owner attestation is valid; a merely non-empty owner field is insufficient.

### T-B15 escalation reference authenticity
Graph cannot derive escalation from raw text; an escalation evidence ref is admitted only when owned evidence resolves and hash matches. Unresolved refs are typed as unresolved evidence.

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

### T-B21 raw-graph dependency boundary
Decision/behavior modules cannot import raw ConversationGraphV1 and must use ConversationGraphEvidenceViewV1.

### T-B22 test namespace requires testRunId
A namespace with environmentId='test' and no testRunId is rejected at type/validation boundary.

### T-B23 escalation invalid-ref
A nonexistent or hash-mismatched escalation evidence ref is rejected from escalationEvidenceRefs and recorded as unresolved.

### T-B24 locale-independent event ordering
eventId final tie-break produces identical ordering under differing process locales.

## W5 entry criteria

W5 characterization RED may begin only when:
- W2 independent reviewer findings are attached to issue #298,
- all W2 BLOCKERs are resolved,
- Tolga freezes W3,
- the exact field set above (or its W2-revised form) is marked authoritative.

Until then this file is planning evidence only.
