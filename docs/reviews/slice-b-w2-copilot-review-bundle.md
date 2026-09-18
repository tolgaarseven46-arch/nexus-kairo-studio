# Slice B W2 — Copilot Review Bundle

This file intentionally copies the exact candidate design into the PR diff so the independent reviewer can inspect the architecture itself rather than only a pointer file.

## Reviewer instructions

# Slice B W2 — Independent red-team handoff

Date: 2026-09-18
Gate: W2 independent reviewer
Authority: reviewer findings are advisory until W3 product freeze

## Read first

1. `docs/slice-b-multi-user-observation-freeze-packet.md`
2. `docs/slice-b-w3-freeze-draft-w4-test-map.md`
3. `docs/adr/2026-09-18-social-platform-test-first-workflow.md`
4. `PROJECT_STATE.md` sections 23–25

## Reviewer mission

Do not approve the design by default.

Try to falsify the claim that Slice B is only an observational Conversation Graph and cannot become:
- a shadow semantic authority,
- a hidden response/engagement authority,
- a relationship/appraisal authority,
- a capability/moderation authority,
- a cross-server or replay leak.

## Mandatory attacks

### Authority
- Can any graph field be consumed as WHAT/WHETHER truth without an explicit adapter?
- Do inferred address candidates belong here at all?
- Does unanswered-turn evidence reopen multi-party engagement authority R?
- Do escalation refs belong in the graph or in a separate observational index?
- Can suppression receipts be forged or accepted from the wrong owner?

### Evidence
- Are platform facts, canonical semantic refs, inferred graph edges and downstream decision receipts distinguishable byte-for-byte?
- Can missing semanticSnapshotRef cause raw text to be reinterpreted?
- Can unresolved refs accidentally be "repaired" into invented edges?

### Identity/isolation
- Is namespace environment + testRun? + server + room + Kaira instance sufficient?
- Can same user in two servers or two Kaira instances leak counters/edges?
- Are human/droit/system identities stable enough to prevent self-trigger loops?

### Ordering/idempotency
- Is occurredAt -> sourceSequence? -> eventId a valid deterministic total order?
- What happens when sourceSequence conflicts with timestamp?
- Are duplicate event ids guaranteed idempotent when payload differs?
- Is event correction/versioning missing?

### Replay
- Can replay rebuild the graph from live platform state?
- Is snapshotHash enough; what exact canonical serialization is hashed?
- Are derivation rule versions frozen with replay evidence?

### Fixtures
- Can cold/warm/experienced-owner metadata accidentally influence production decision inputs?
- Should experienced-owner exist only in fixture-builder metadata and nowhere in graph/runtime types?

### Privacy/data minimization
- Are participant counters/timestamps necessary?
- Could graph retention unintentionally become behavioral profiling?
- Which fields should be ephemeral vs persisted?

## Required output format

### BLOCKERS
For each:
- ID
- concrete counterexample
- violated authority/invariant
- minimum repair
- required test

### NON-BLOCKERS
For each:
- ID
- why it is not promotion-blocking
- recommended cleanup/test

### FUTURE / OUT-OF-SCOPE
For each:
- ID
- why it should not reopen Slice B

### Explicit verdicts
Answer each exactly:
1. Shadow semantic authority blocker remains? YES/NO
2. Hidden engagement/response authority blocker remains? YES/NO
3. Cross-server/Kaira isolation blocker remains? YES/NO
4. Replay purity blocker remains? YES/NO
5. Determinism/idempotency blocker remains? YES/NO
6. Privacy/data-minimization blocker remains? YES/NO
7. Safe to enter W3 freeze after listed blocker repairs? YES/NO

Do not provide an overall score.
Do not redesign unrelated frozen A–S architecture unless a concrete Slice B counterexample proves a frozen invariant violation.


---

## Candidate freeze packet

# Slice B — Multi-user observation freeze packet

Date: 2026-09-18
Status: W0/W1 COMPLETE — W2 independent red-team required before W3 freeze
Scope: Kaira × PrivatRoom, Conversation Graph observation only

## W0 — Product problem

Kaira now has a proven TestRun/replay/observability foundation, but a social room contains multiple people whose messages, references and reactions form one shared conversation.

The next problem is not "make Kaira talk to everyone at once."
The problem is to represent enough room-level evidence so later behavior can distinguish:

- who spoke,
- who was addressed,
- who replied to whom,
- who ignored whom,
- when Kaira intentionally suppressed a response,
- when a thread escalated,
- whether the current actor is cold, warm, or an experienced owner,

without creating a second semantic authority, relationship leak, or hidden behavior authority.

## Boundary

Slice B is observational.

It may create typed evidence and deterministic fixtures.
It may not:

- decide whether Kaira should answer,
- grant a moderation/action capability,
- alter relationship/appraisal state,
- infer demographic/personality truth,
- mutate platform state,
- replace canonical SemanticInterpretation@2,
- reopen true simultaneous multi-party engagement authority R.

Any future answer/suppression decision must consume Slice B evidence through an explicitly owned downstream decision seam in a later slice.

## Conversation Graph v1 — candidate evidence model

### Identity
- serverId
- roomId
- conversationId
- ordered eventId
- occurredAt

### Participant node
- userId
- platform role facts only
- firstSeenAt / lastSeenAt
- room message count
- owner-history class: cold | warm | experienced-owner

No personality, gender, age-band, inferred trust, inferred toxicity or relationship score belongs here.

### Message/event edge
- eventId
- actorUserId
- canonical semantic snapshot reference/id
- explicit replyToEventId when supplied by platform
- explicit mentionedUserIds when supplied by platform
- explicit addressedToUserIds evidence
- suppressedResponse evidence record when a downstream owner explicitly records suppression
- ignoredBy evidence derived only from observable turn-window rules
- escalation evidence derived from typed event sequence, never raw-text reinterpretation

### Evidence discipline
- explicit platform facts outrank heuristic graph inference,
- inferred graph links carry confidence + evidence source,
- graph inference may remain unknown,
- raw text may be retained as transcript evidence but graph code may not create canonical semantic meaning from it,
- per-user relationship/memory state is referenced, never merged into room-global graph truth.

## W1 — Scenario expansion

### B1 Cold room / first contact
Owner creates a room; Kaira has no room history. Two members greet each other, one later mentions Kaira.
Expected observation:
- participant nodes exist,
- no fabricated prior familiarity,
- explicit mention edge is recorded,
- no response decision is made by graph layer.

### B2 Warm room / repeated participants
Same participants return across multiple turns.
Expected:
- stable participant identity,
- ordered event history,
- warm fixture classification is fixture metadata, not inferred relationship truth,
- no cross-user memory merge.

### B3 Experienced owner
Owner has prior server/room management history.
Expected:
- owner-history fixture can be represented as platform/test context,
- it cannot grant capability or alter Kaira's decision by itself.

### B4 Direct reply chain
A replies to B; C replies to A.
Expected:
- reply edges preserve exact event ids,
- participant attribution remains deterministic,
- no text-based guess overrides explicit reply metadata.

### B5 Mention ambiguity
Message mentions A and B while replying to C.
Expected:
- reply edge and mention edges coexist,
- graph does not choose a single conversational target unless a downstream authority owns that decision.

### B6 Kaira explicitly addressed
Platform metadata says Kaira was mentioned/addressed.
Expected:
- addressedTo evidence records Kaira target,
- graph does not independently decide to answer.

### B7 Suppressed response
A downstream decision owner records "do not answer."
Expected:
- graph records suppression as evidence with owner/source,
- graph cannot create suppression itself,
- later review can distinguish "not addressed" from "addressed but suppressed."

### B8 Ignored-by sequence
A asks B a direct question; B posts multiple subsequent messages without responding.
Expected:
- ignoredBy is observable sequence evidence with a bounded turn/time window,
- absence of reply is not converted into motive, hostility or relationship damage.

### B9 Escalation sequence
Multiple canonical events already carry rising conflict/negative social-appraisal evidence.
Expected:
- graph may record an escalation sequence descriptor,
- it may not reclassify raw text or mutate appraisal,
- confidence must fall when event evidence is missing/ambiguous.

### B10 Fragmented messages
One participant sends a thought across 3 short messages.
Expected:
- ordered events remain separate,
- discourse/episode owner may correlate them elsewhere,
- graph does not fuse them into new semantics.

### B11 Cross-server same users
A and B appear in server X and server Y.
Expected:
- graph namespaces are server/room scoped,
- zero graph-edge leakage,
- same user id does not imply same room context.

### B12 Replay
A frozen Slice B graph is replayed.
Expected:
- graph input comes only from frozen snapshot,
- no live platform fetch,
- no production graph mutation,
- deterministic output.

### B13 Deleted/missing event
replyToEventId points to unavailable event.
Expected:
- unresolved reference remains typed unresolved evidence,
- no fabricated parent event.

### B14 Out-of-order delivery
event 3 arrives before event 2.
Expected:
- ordering uses occurredAt + deterministic tie-break/event sequence contract,
- reordering does not duplicate edges or mutate unrelated participant state.

### B15 Duplicate delivery
same eventId arrives twice.
Expected:
- idempotent graph ingestion,
- no duplicate message count/edge.

### B16 Kaira self-message
Kaira's own persisted reply re-enters observation stream.
Expected:
- participant attribution records Kaira as system/droit actor,
- no self-trigger loop,
- graph remains observation-only.

## Failure classes

B-F1 cross-user attribution leak
B-F2 cross-server graph leak
B-F3 duplicate-event inflation
B-F4 out-of-order nondeterminism
B-F5 explicit-reply overridden by heuristic
B-F6 graph creates semantic truth
B-F7 graph creates behavior/response authority
B-F8 graph creates moderation/capability authority
B-F9 ignoredBy becomes motive/relationship judgment
B-F10 escalation reinterprets raw text
B-F11 suppressedResponse source is ambiguous
B-F12 replay reads live state
B-F13 unresolved references are fabricated
B-F14 owner-history metadata affects WHAT/WHETHER directly
B-F15 Kaira self-message causes recursive engagement

## W2 — Independent red-team request

The independent reviewer should attack the model above, not merely approve it.

Required questions:

1. Can Conversation Graph accidentally become a shadow semantic authority?
2. Can addressedTo / ignoredBy / escalation evidence silently become a response-decision authority?
3. Are explicit platform reply/mention facts clearly separated from inferred graph edges?
4. Is ignoredBy observable enough to avoid motive attribution?
5. Can warm/experienced-owner fixtures leak into relationship or capability truth?
6. Are server/room/testRun namespaces sufficient for zero-leak proof?
7. Is replay fully snapshot-bound and side-effect-free?
8. Can duplicate/out-of-order events produce different graph state?
9. Can Kaira's own reply re-enter and create a loop?
10. Are any fields missing for audit/review provenance?
11. Which candidate fields should be removed because they belong to another authority?
12. What counterexample would make this design unsafe to freeze?

Reviewer must classify findings as:
- BLOCKER
- NON-BLOCKER
- FUTURE / OUT-OF-SCOPE

## W3 freeze criteria

Tolga product freeze can occur only after W2 findings are resolved.

Required W3 decisions:
- exact ConversationGraphV1 field set,
- explicit vs inferred edge precedence,
- ignoredBy bounded-window rule,
- escalation evidence source contract,
- cold/warm/experienced-owner fixture definitions,
- namespace/idempotency/order rules,
- confirmation that graph remains observation-only.

## Draft W4 test map — not active until W3

After freeze, characterization must cover at minimum:
- explicit reply precedence,
- multi-mention ambiguity,
- suppressed-response source ownership,
- ignoredBy no-motive guarantee,
- escalation no-raw-text-reinterpretation,
- cold/warm/experienced-owner decision-neutrality,
- duplicate idempotency,
- out-of-order determinism,
- cross-server zero leak,
- replay parity,
- Kaira self-message non-recursion.

No W5 characterization RED or production implementation starts before W2 + W3.


## Non-authoritative pre-red-team hardening

This section is internal adversarial preparation only. It does NOT satisfy W2 independent review.

### Candidate blockers found internally

#### PRT-B1 — `addressedToUserIds` risks becoming hidden engagement authority
If stored as a plain resolved field, downstream consumers may treat it as truth instead of evidence.

Hardening:
- split explicit platform targets from inferred candidate targets,
- explicit target evidence may contain platform reply/mention facts,
- inferred target evidence must carry confidence + source + unresolved state,
- no single resolved "targetUserId" field exists in ConversationGraphV1.

#### PRT-B2 — `ignoredBy` is semantically loaded
The label can imply intent/motive even when only absence-of-reply is observable.

Hardening:
- rename graph evidence to `unansweredAddressedTurn`,
- store bounded observation window + source event ids,
- downstream appraisal may interpret it later, but graph does not call anyone "ignoring" anyone.

#### PRT-B3 — escalation must not be recomputed from raw text
A graph-level escalation score would become shadow appraisal/semantic authority.

Hardening:
- graph stores only `escalationEvidenceRefs` pointing to already-owned canonical/appraisal evidence,
- no raw-text sentiment/toxicity classifier inside graph,
- graph may summarize monotonic evidence presence/count, never invent escalation meaning.

#### PRT-B4 — cold/warm/experienced-owner is ambiguous
If derived from message counts in graph, it can silently become relationship truth.

Hardening:
- fixture lifecycle class is test metadata only,
- production graph stores objective counters/timestamps only,
- no production `warm` or `experienced-owner` boolean/enum exists.

#### PRT-B5 — suppression evidence needs ownership provenance
A bare suppressedResponse flag could let graph become behavior authority.

Hardening:
- graph can only record a suppression receipt emitted by an owning decision layer,
- receipt must include owner, decisionId, sourceEventId, occurredAt and reasonCode,
- graph has no API that computes suppression.

#### PRT-B6 — ordering needs one deterministic total-order rule
`occurredAt` alone permits ties and replay drift.

Hardening:
- canonical graph order key = `occurredAt -> sourceSequence? -> eventId`,
- sourceSequence, if platform-supplied, is factual evidence only,
- eventId is deterministic final tie-breaker.

#### PRT-B7 — graph version/provenance was under-specified
Review/replay needs exact graph schema/derivation version.

Hardening:
- every graph snapshot carries `schemaVersion`, `derivationVersion`, `namespace`, and `builtFromEventIds`,
- inferred edges carry derivation rule id/version,
- replay compares snapshot/hash/version rather than rebuilding from live data.

#### PRT-B8 — self-message non-recursion needs explicit input role
Actor user id alone may be insufficient if Droit identities share user-like records.

Hardening:
- participant actor kind = `human | droit | system` from platform-owned identity fact,
- graph records Kaira/Droit self events but never turns them into trigger decisions,
- recursive engagement remains a downstream decision/runtime invariant.

### Revised candidate ConversationGraphV1 shape

- schemaVersion
- derivationVersion
- namespace: environmentId + testRunId? + serverId + roomId + kairaInstanceId
- conversationId
- participants: objective platform facts + firstSeenAt/lastSeenAt/messageCount
- events: eventId, actorId, actorKind, occurredAt, sourceSequence?, semanticSnapshotRef?
- explicitReplyEdges
- explicitMentionEdges
- inferredAddressCandidateEdges { fromEventId, toParticipantId, confidence, ruleId, evidenceEventIds }
- unresolvedReferences
- unansweredAddressedTurnEvidence { addressedEventId, addresseeId, windowStart, windowEnd, observedEventIds }
- suppressionReceipts { decisionId, owner, sourceEventId, reasonCode, occurredAt }
- escalationEvidenceRefs { eventId, evidenceOwner, evidenceRef }
- builtFromEventIds
- snapshotHash

Explicit platform facts always outrank inferred edges. Inference can remain unresolved/ambiguous.

### Remaining W2 questions after hardening

Independent reviewer should focus on:
1. whether even inferred address candidates belong in graph or should live in discourse/attention evidence,
2. whether unanswered-turn evidence should exist at all before R engagement authority is opened,
3. whether escalation evidence refs belong in graph or a parallel observational index,
4. whether participant counters/timestamps can leak into downstream WHAT/WHETHER without an explicit adapter,
5. whether namespace composition is sufficient for replay + cross-server + multi-Kaira isolation.


---

## Candidate W3 freeze + W4 test map

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


---

## Candidate W5 fixture spec

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

