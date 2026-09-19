# Slice B W2 — External review repair resolution

Date: 2026-09-19
Status: BLOCKER REPAIRS PROPOSED — independent re-review still required
Source review: issue #338 / external Claude artifact `kaira-slice-b-w2-independent-review.md`

This document records how each external W2 blocker is addressed in the W3 draft and inactive fixture map.
It does NOT freeze W3 and does NOT activate W5.

## B-W2-01 — raw graph import / shadow authority

Repair:
- introduce `ConversationGraphEvidenceViewV1` as the explicit downstream whitelist view;
- decision/behavior modules must not import raw `ConversationGraphV1`;
- inferred address candidates, suppression receipts and escalation refs are excluded from the generic downstream view.

Required proof at W4/W5 boundary:
- static dependency-boundary test forbidding raw `ConversationGraphV1` imports from decision/behavior modules.

## B-W2-02 — unanswered-turn evidence reopens R

Repair:
- remove `unansweredAddressedTurnEvidence` from persisted production `ConversationGraphV1`;
- defer the evidence class until R is formally reopened;
- replace the previous fixture with an R-scope-exclusion fixture.

## B-W2-03 — escalation ref authenticity

Repair:
- escalation refs are admitted only after referenced owned evidence resolves and hash matches;
- unresolved/mismatched refs move to `unresolvedReferences` with `referenceType='escalation_evidence'`;
- add symmetric valid/invalid fixture coverage.

## B-W2-04 — suppression owner authenticity

Repair:
- replace free-form structural owner trust with a registered decision-owner identity boundary;
- receipt requires registry version + attestation reference;
- well-formed but unregistered/unauthorized owner receipts fail closed.

## B-W2-05 — optional testRunId collision

Repair:
- namespace becomes a discriminated union;
- `environmentId='test'` requires `testRunId` at the type boundary;
- add missing-testRunId rejection fixture.

## B-W2-06 — replay semantic ref live lookup

Repair:
- introduce `ConversationGraphReplayBundleV1`;
- the bundle contains the graph plus frozen resolved semantic snapshots + hashes;
- replay may not resolve `semanticSnapshotRef` from a live semantic store;
- T-B11/T-B12 explicitly require zero live semantic-store calls.

## Non-blocker hardening accepted

- participant counters/timestamps are namespace-local, non-profile facts and may not outlive retained source evidence;
- eventId final tie-break is locale-independent byte/codepoint ordering;
- platform actorKind mapping gets an explicit integrity contract/test target.

## Re-review gate

W2 is not closed by these edits.
An independent reviewer must inspect the delta and return a fresh machine-readable verdict.
W3 can freeze only when:
- the re-review contains zero BLOCKERs,
- all six blocker verdict classes are false,
- `safeToEnterW3AfterRepairs=true`,
- trusted external provenance is attached.


## Re-review #2 — B-W2-R01 runtime ingestion boundary

Second independent Claude re-review (issue #340) confirmed B-W2-01..06 are closed, but found one new blocker: compile-time TypeScript constraints alone do not reject malformed raw external payloads.

Repair:
- add canonical runtime parsers for ConversationGraphNamespaceV1, SuppressionReceiptV1 and EscalationEvidenceRefV1;
- add one aggregate `parseConversationGraphExternalIngressV1` seam for raw payload → typed graph evidence transition;
- require decision-owner registry version + owner attestation validation at runtime;
- require escalation evidence owner/ref/hash resolution at runtime;
- add a real runtime `buildConversationGraphEvidenceViewV1` redaction constructor that physically omits excluded keys;
- brand escalation evidence owner identity consistently;
- replay bundle validation now fails closed if any referenced semanticSnapshotRef is missing from the frozen bundle.

Historical RED:
- commit `6e3a23620489c7904d2ddb2111ccdeb08af0cb2d`;
- CI run `35436632970`;
- exact RED: new ingress suite could not load `sliceBConversationGraphIngressContracts`; 570 existing test files remained GREEN and only the new runtime-ingress proof suite failed.

GREEN target:
- raw JSON fixtures must reject missing testRunId, unregistered suppression owner and hash-mismatched escalation evidence;
- valid raw payloads may become typed values only through the parser;
- evidence view must remove excluded keys at runtime;
- replay missing semantic snapshot must fail closed.

W2 remains open until a third independent re-review of this runtime repair returns zero blockers.
