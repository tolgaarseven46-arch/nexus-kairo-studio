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
